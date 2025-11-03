/*
 * Teleport
 * Copyright (C) 2025  Gravitational, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package common

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/alecthomas/kingpin/v2"
	"github.com/gravitational/trace"
	"google.golang.org/protobuf/types/known/durationpb"

	"github.com/gravitational/teleport"
	delegationv1 "github.com/gravitational/teleport/api/gen/proto/go/teleport/delegation/v1"
	"github.com/gravitational/teleport/api/types"
	"github.com/gravitational/teleport/api/utils/prompt"
	"github.com/gravitational/teleport/lib/client"
	"github.com/gravitational/teleport/lib/defaults"
	"github.com/gravitational/teleport/lib/utils/slices"
)

type delegationCommand struct {
	*kingpin.CmdClause

	profileName string
	sessionTTL  time.Duration
	resourceIDs []string
	botNames    []string
	format      string
}

func newDelegationCommand(app *kingpin.Application) *delegationCommand {
	cmd := &delegationCommand{
		CmdClause: app.Command("delegate-access", "Temporarily lend your access to a machine or workload."),
	}
	cmd.Flag("profile", "Name of the delegation profile that will be used.").StringVar(&cmd.profileName)
	cmd.Flag("session-ttl", "How long access will be delegated to the machine or workload.").DurationVar(&cmd.sessionTTL)
	cmd.Flag("resource", "Resource that may be accessed by the machine or workload.").StringsVar(&cmd.resourceIDs)
	cmd.Flag("bot", "Bot that access will be delegated to.").StringsVar(&cmd.botNames)

	formats := []string{teleport.Text, teleport.JSON}
	cmd.Flag("format", defaults.FormatFlagDescription(formats...)).Short('f').Default(teleport.Text).EnumVar(&cmd.format, formats...)

	return cmd
}

func (c *delegationCommand) run(conf *CLIConf) error {
	if err := c.validateFlags(); err != nil {
		return err
	}

	tc, err := makeClient(conf)
	if err != nil {
		return trace.Wrap(err)
	}

	var profile *delegationv1.DelegationProfile
	if c.profileName != "" {
		err := client.RetryWithRelogin(conf.Context, tc, func() error {
			cl, err := tc.ConnectToCluster(conf.Context)
			if err != nil {
				return trace.Wrap(err)
			}
			defer cl.Close()

			profile, err = cl.AuthClient.DelegationProfileServiceClient().
				GetDelegationProfile(conf.Context, &delegationv1.GetDelegationProfileRequest{
					Name: c.profileName,
				})
			return trace.Wrap(err)
		})
		if err != nil {
			return trace.Wrap(err)
		}
	}

	var (
		req       delegationv1.CreateDelegationSessionRequest
		resources []string
		users     []*delegationv1.DelegationUserSpec
	)
	if profile == nil {
		resources = c.resourceIDs
		users = slices.Map(c.botNames, func(name string) *delegationv1.DelegationUserSpec {
			return &delegationv1.DelegationUserSpec{
				Type: types.DelegationUserTypeBot,
				Matcher: &delegationv1.DelegationUserSpec_BotName{
					BotName: name,
				},
			}
		})
		req.From = &delegationv1.CreateDelegationSessionRequest_Parameters{
			Parameters: &delegationv1.DelegationSessionParameters{
				Resources:       resources,
				AuthorizedUsers: users,
			},
		}
	} else {
		resources = profile.GetSpec().GetRequiredResources()
		users = profile.GetSpec().GetAuthorizedUsers()
		req.From = &delegationv1.CreateDelegationSessionRequest_Profile{
			Profile: &delegationv1.DelegationProfileReference{
				Name:     profile.GetMetadata().GetName(),
				Revision: profile.GetMetadata().GetRevision(),
			},
		}
	}
	if c.sessionTTL != 0 {
		req.Ttl = durationpb.New(c.sessionTTL)
	}

	confirmed, err := c.promptForConsent(conf, resources, users)
	if err != nil {
		return trace.Wrap(err)
	}
	if !confirmed {
		return nil
	}

	var session *delegationv1.DelegationSession
	err = client.RetryWithRelogin(conf.Context, tc, func() error {
		cl, err := tc.ConnectToCluster(conf.Context)
		if err != nil {
			return trace.Wrap(err)
		}
		defer cl.Close()

		session, err = cl.AuthClient.DelegationSessionServiceClient().
			CreateDelegationSession(conf.Context, &req)
		return trace.Wrap(err)
	})
	if err != nil {
		return trace.Wrap(err)
	}

	if err := c.printSession(conf, session); err != nil {
		return trace.Wrap(err)
	}

	return nil
}

func (c *delegationCommand) validateFlags() error {
	if c.profileName == "" {
		if len(c.botNames) == 0 {
			return trace.BadParameter("--bot or --profile is required")
		}
		if len(c.resourceIDs) == 0 {
			return trace.BadParameter("--resource or --profile is required")
		}
	} else {
		if len(c.botNames) != 0 {
			return trace.BadParameter("cannot use --bot with --profile")
		}
		if len(c.resourceIDs) != 0 {
			return trace.BadParameter("cannot use --resource with --profile")
		}
	}
	return nil
}

func (c *delegationCommand) promptForConsent(
	conf *CLIConf,
	resources []string,
	users []*delegationv1.DelegationUserSpec,
) (bool, error) {
	var b strings.Builder
	fmt.Fprintln(&b, "Access delegation allows you to temporarily lend your identity to a machine or workload.")
	fmt.Fprintln(&b, "")

	fmt.Fprintln(&b, "The following bots:")
	for _, user := range users {
		fmt.Fprintf(&b, "- %s\n", user.GetBotName())
	}
	fmt.Fprintln(&b, "")

	fmt.Fprintln(&b, "Will be able to access the following resources on your behalf:")
	for _, resource := range resources {
		fmt.Fprintf(&b, "- %q\n", resource)
	}
	fmt.Fprintln(&b, "")

	fmt.Fprint(&b, "Are you sure you wish to proceed?")
	return prompt.Confirmation(
		conf.Context,
		conf.Stderr(),
		prompt.Stdin(),
		b.String(),
	)
}

func (c *delegationCommand) printSession(conf *CLIConf, session *delegationv1.DelegationSession) error {
	switch c.format {
	case teleport.JSON:
		if err := json.NewEncoder(conf.Stdout()).Encode(struct {
			SessionID string `json:"session_id"`
		}{session.GetMetadata().GetName()}); err != nil {
			return trace.Wrap(err)
		}
	default:
		fmt.Fprintf(
			conf.Stdout(),
			"Delegation session created. It will expire at: %s.\nProvide this Session ID to your workload or in your tbot configuration: %q\n",
			session.GetMetadata().GetExpires().AsTime().Format(time.RFC3339),
			session.GetMetadata().GetName(),
		)
	}

	return nil
}
