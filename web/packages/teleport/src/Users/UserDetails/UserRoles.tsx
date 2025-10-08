/**
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

import { useState } from 'react';

import { Button, Flex, Label } from 'design';
import * as Icons from 'design/Icon';
import {
  InfoParagraph,
  InfoTitle,
} from 'shared/components/SlidingSidePanel/InfoGuide';

import {
  ClickableLabel,
  ExpandableContainer,
  type UserDetailsSectionProps,
} from './UserDetails';

export function UserRoles({ user, canEdit, onEdit }: UserDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user?.roles) return null;

  const rolesToShow = isExpanded ? user.roles : user.roles.slice(0, 7);
  const hasMoreRoles = user.roles.length > 7;

  return (
    <>
      <InfoTitle>
        <Flex justifyContent="space-between" alignItems="center">
          <span>Roles ({user.roles?.length || 0})</span>
          {canEdit && (
            <Button
              fill="minimal"
              intent="neutral"
              onClick={onEdit}
              size="small"
              gap={1}
            >
              <Icons.Edit />
              Edit
            </Button>
          )}
        </Flex>
      </InfoTitle>
      <InfoParagraph>
        {user.roles && user.roles.length > 0 && (
          <>
            <ExpandableContainer isExpanded={isExpanded}>
              <Flex rowGap={1} columnGap={2} flexWrap="wrap">
                {rolesToShow.map(role => (
                  <Label key={role} kind="secondary">
                    <Flex gap={1}>
                      <Icons.UserIdBadge size={16} />
                      {role}
                    </Flex>
                  </Label>
                ))}
                {hasMoreRoles && !isExpanded && (
                  <ClickableLabel
                    kind="secondary"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    + {user.roles.length - 7} more
                  </ClickableLabel>
                )}
              </Flex>
            </ExpandableContainer>
            {hasMoreRoles && isExpanded && (
              <Flex mt={2}>
                <ClickableLabel
                  kind="secondary"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  Show less
                </ClickableLabel>
              </Flex>
            )}
          </>
        )}
      </InfoParagraph>
    </>
  );
}
