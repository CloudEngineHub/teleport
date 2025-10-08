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

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useHistory } from 'react-router';

export interface UsersUrlState {
  search: string;
  page: number;
  username: string | null;
}

export function searchParamsToState(params: URLSearchParams): UsersUrlState {
  const state: UsersUrlState = {
    search: '',
    page: 1,
    username: null,
  };

  const search = params.get('search');
  if (search) {
    state.search = search;
  }

  const page = params.get('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      state.page = pageNum;
    }
  }

  const username = params.get('username');
  if (username) {
    state.username = username;
  }

  return state;
}

export function stateToSearchParams(state: UsersUrlState): string {
  const urlParams = new URLSearchParams();

  if (state.search) {
    urlParams.set('search', state.search);
  }

  if (state.page > 1) {
    urlParams.set('page', state.page.toString());
  }

  if (state.username) {
    urlParams.set('username', state.username);
  }

  return urlParams.toString();
}

export function useUsersUrlState(): [
  UsersUrlState,
  Dispatch<SetStateAction<UsersUrlState>>,
] {
  const history = useHistory();

  const [state, setState] = useState<UsersUrlState>(() =>
    searchParamsToState(new URLSearchParams(history.location.search))
  );

  const currentSearch = useRef<string>(history.location.search);

  useEffect(() => {
    const params = stateToSearchParams(state);
    currentSearch.current = params ? `?${params}` : '';

    if (history.location.search !== currentSearch.current) {
      history.replace({ search: currentSearch.current });
    }
  }, [history, state]);

  useEffect(() => {
    return history.listen(next => {
      if (next.search !== currentSearch.current) {
        setState(searchParamsToState(new URLSearchParams(next.search)));
        currentSearch.current = next.search;
      }
    });
  }, [history]);

  return [state, setState];
}
