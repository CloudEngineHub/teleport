/**
 * Teleport
 * Copyright (C) 2025 Gravitational, Inc.
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

import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { PropsWithChildren } from 'react';
import { Router } from 'react-router';

import {
  searchParamsToState,
  stateToSearchParams,
  useUsersUrlState,
  type UsersUrlState,
} from './state';

describe('searchParamsToState', () => {
  it('returns default state when no params provided', () => {
    const params = new URLSearchParams();
    const state = searchParamsToState(params);

    expect(state).toEqual({
      search: '',
      page: 1,
      username: null,
    });
  });

  it('parses parameters', () => {
    const params = new URLSearchParams('?search=admin&page=3&username=bob');
    const state = searchParamsToState(params);

    expect(state.search).toBe('admin');
    expect(state.page).toBe(3);
    expect(state.username).toBe('bob');
  });
});

describe('stateToSearchParams', () => {
  it('returns empty params for default state', () => {
    const state: UsersUrlState = {
      search: '',
      page: 1,
      username: null,
    };

    const params = stateToSearchParams(state);
    expect(params).toBe('');
  });

  it('combines all parameters correctly', () => {
    const state: UsersUrlState = {
      search: 'test',
      page: 2,
      username: 'alice@company.com',
    };

    const params = stateToSearchParams(state);
    const urlParams = new URLSearchParams(params);

    expect(urlParams.get('search')).toBe('test');
    expect(urlParams.get('page')).toBe('2');
    expect(urlParams.get('username')).toBe('alice@company.com');
  });
});

describe('useUsersUrlState', () => {
  it('initializes state from URL search params', () => {
    const history = createMemoryHistory({
      initialEntries: ['/users?search=test&page=2&username=alice@company.com'],
    });

    function wrapper({ children }: PropsWithChildren) {
      return <Router history={history}>{children}</Router>;
    }

    const { result } = renderHook(() => useUsersUrlState(), {
      wrapper,
    });

    const [state] = result.current;

    expect(state.search).toBe('test');
    expect(state.page).toBe(2);
    expect(state.username).toBe('alice@company.com');
  });

  it('updates URL when state changes', () => {
    const history = createMemoryHistory();

    function wrapper({ children }: PropsWithChildren) {
      return <Router history={history}>{children}</Router>;
    }

    const { result } = renderHook(() => useUsersUrlState(), {
      wrapper,
    });

    const [, setState] = result.current;

    act(() => {
      setState(prev => ({
        ...prev,
        search: 'new search',
        username: 'selected-user',
      }));
    });

    expect(history.location.search).toContain('search=new+search');
    expect(history.location.search).toContain('username=selected-user');
  });
});
