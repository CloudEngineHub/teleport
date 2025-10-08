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

import styled from 'styled-components';

import { Box, Button, Flex, Label, Text } from 'design';
import * as Icons from 'design/Icon';
import { MoreVert } from 'design/Icon';
import { ResourceIcon, ResourceIconName } from 'design/ResourceIcon';
import { MenuIcon, MenuItem } from 'shared/components/MenuAction';
import {
  InfoParagraph,
  InfoTitle,
} from 'shared/components/SlidingSidePanel/InfoGuide';

import { useListLocks } from 'teleport/services/locks';
import { User } from 'teleport/services/user';

const UserDetailsActions = ({
  user,
  canEdit,
  canDelete,
  onEdit,
  onReset,
  onDelete,
}: {
  user: User;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onReset?: () => void;
  onDelete?: () => void;
}) => {
  if (!(canEdit || canDelete)) {
    return null;
  }

  if (user.isBot || !user.isLocal) {
    return null;
  }

  return (
    <MenuIcon
      Icon={MoreVert}
      menuProps={{
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
        transformOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
      }}
    >
      {canEdit && onEdit && <MenuItem onClick={onEdit}>Edit</MenuItem>}
      {canEdit && onReset && (
        <MenuItem onClick={onReset}>Reset Authentication</MenuItem>
      )}
      {canDelete && onDelete && <MenuItem onClick={onDelete}>Delete</MenuItem>}
    </MenuIcon>
  );
};

export interface UserDetailsTitleProps {
  user: User;
  onEdit?: () => void;
  onReset?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  panelWidth?: number;
}

export function UserDetailsTitle({
  user,
  onEdit,
  onReset,
  onDelete,
  canEdit = false,
  canDelete = false,
  panelWidth = 480,
}: UserDetailsTitleProps) {
  const { text: authType, icon } = renderAuthType(user);

  // needed to fill InfoGuidePanel for UserDetailsActions
  const containerWidth = panelWidth - 80;

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      minWidth={`${containerWidth}px`}
    >
      <Flex alignItems="center" gap={3}>
        {user.isBot ? <Icons.Bots size={48} /> : <Icons.User size={48} />}
        <Box maxWidth={300}>
          <Text fontSize={3} fontWeight="bold">
            {user.name}
          </Text>
          <Flex alignItems="center" gap={2}>
            <ResourceIcon name={icon} width="16px" height="16px" />
            <Text
              fontSize={2}
              color="text.muted"
              fontWeight="normal"
              style={{ textTransform: 'capitalize' }}
            >
              {authType}
              {user.isBot ? ' (Bot)' : ''}
            </Text>
          </Flex>
        </Box>
      </Flex>
      <UserDetailsActions
        user={user}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onReset={onReset}
        onDelete={onDelete}
      />
    </Flex>
  );
}

export interface UserDetailsSectionProps {
  user: User;
  canEdit?: boolean;
  onEdit?: () => void;
}

export interface UserDetailsProps {
  user: User;
  sections?: React.ComponentType<UserDetailsSectionProps>[];
  canEdit?: boolean;
  onEdit?: () => void;
}

export function UserDetails({
  user,
  sections = [],
  canEdit = false,
  onEdit,
}: UserDetailsProps) {
  if (!user) return null;

  const { data: locks, isLoading: isLoadingLocks } = useListLocks({
    inForceOnly: true,
    targets: [{ kind: 'user', name: user.name }],
  });

  const isLocked = locks?.length > 0;

  return (
    <Box>
      <UserDetailsSection>
        <InfoTitle>User details</InfoTitle>
        <InfoParagraph>
          <UserDetailsGrid>
            <UserDetailField>
              <Text fontWeight="medium">Username</Text>
              <Text color="text.muted">{user.name}</Text>
            </UserDetailField>
            <UserDetailField>
              <Text fontWeight="medium">Auth Type</Text>
              <Text color="text.muted" style={{ textTransform: 'capitalize' }}>
                {renderAuthType(user).text}
              </Text>
            </UserDetailField>
            <UserDetailField>
              <Text fontWeight="medium">Status</Text>
              <Flex alignItems="center" gap={2}>
                <Box
                  width="8px"
                  height="8px"
                  borderRadius="50%"
                  backgroundColor={
                    isLoadingLocks
                      ? 'text.muted'
                      : isLocked
                        ? 'error.main'
                        : 'success.main'
                  }
                />
                <Text color="text.muted">
                  {isLoadingLocks ? 'Unknown' : isLocked ? 'Locked' : 'Active'}
                </Text>
              </Flex>
            </UserDetailField>
          </UserDetailsGrid>
        </InfoParagraph>
      </UserDetailsSection>

      {sections.map((SectionComponent, index) => (
        <UserDetailsSection key={index}>
          <SectionComponent user={user} canEdit={canEdit} onEdit={onEdit} />
        </UserDetailsSection>
      ))}
    </Box>
  );
}

export function UserTraits({ user, canEdit, onEdit }: UserDetailsSectionProps) {
  if (!user?.allTraits) return null;

  const traitsWithValues = Object.keys(user.allTraits).filter(
    key =>
      user.allTraits[key].length > 0 &&
      user.allTraits[key].some(value => value.trim() !== '')
  );

  return (
    <>
      <InfoTitle>
        <Flex justifyContent="space-between" alignItems="center">
          <span>Traits</span>
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
        {traitsWithValues.length === 0 ? (
          <Text color="text.muted">No traits assigned</Text>
        ) : (
          <Flex flexWrap="wrap" gap={2}>
            {traitsWithValues.map(key => (
              <Label key={key} kind="secondary">
                {key}: {user.allTraits[key].join(', ')}
              </Label>
            ))}
          </Flex>
        )}
      </InfoParagraph>
    </>
  );
}

type AuthTypeInfo = {
  text: string;
  icon: ResourceIconName;
};

const authTypeMap: Record<string, AuthTypeInfo> = {
  github: { text: 'GitHub', icon: 'github' },
  oidc: { text: 'OIDC', icon: 'openid' },
  okta: { text: 'Okta', icon: 'okta' },
  scim: { text: 'SCIM', icon: 'scim' },
  saml: { text: 'SAML', icon: 'application' },
};

export type UserDetailsAuthType = keyof typeof authTypeMap;

function renderAuthType(user: User): AuthTypeInfo {
  const key =
    user.authType === 'saml' && user.origin ? user.origin : user.authType;
  return authTypeMap[key] || { text: user.authType, icon: 'server' };
}

export const UserDetailsSection = styled(Box)`
  border-bottom: 1px solid
    ${props => props.theme.colors.interactive.tonal.neutral[0]};
  margin: -${props => props.theme.space[3]}px;
  padding: ${props => props.theme.space[3]}px;
  min-height: 116px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const UserDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 12px;
`;

export const UserDetailField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[1]}px;
`;

export const StyledInfoParagraph = styled(InfoParagraph)`
  border-bottom: 1px solid ${props => props.theme.colors.levels.sunken};

  margin: -${props => props.theme.space[3]}px;
  padding: ${props => props.theme.space[3]}px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const ClickableLabel = styled(Label)`
  cursor: pointer;
  background: ${props => props.theme.colors.interactive.tonal.informational[0]};
  color: ${props => props.theme.colors.text.slightlyMuted};

  &:hover {
    background: ${props =>
      props.theme.colors.interactive.tonal.informational[1]};
    color: ${props => props.theme.colors.text.main};
  }
`;

export const ExpandableContainer = styled.div<{ isExpanded: boolean }>`
  ${props =>
    props.isExpanded &&
    `
    max-height: 200px;
    overflow-y: auto;
  `}
`;
