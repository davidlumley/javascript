import { constants } from '@clerk/backend/internal';
import type { InitialState, Without } from '@clerk/types';
import { cookies } from 'next/headers';
import React from 'react';

import type { NextClerkProviderProps } from '../../types';
import { mergeNextClerkPropsWithEnv } from '../../utils/mergeNextClerkPropsWithEnv';
import { ClientClerkProvider } from '../client/ClerkProvider';
import { initialState } from './auth';

const fetchEphemeralCookie = () => {
  const { get } = cookies();
  return get(constants.Cookies.PublishableKey)?.value;
};

export function ClerkProvider(props: Without<NextClerkProviderProps, '__unstable_invokeMiddlewareOnAuthStateChange'>) {
  const { children, ...rest } = props;
  const state = initialState()?.__clerk_ssr_state as InitialState;
  const publishableKey = rest.publishableKey || fetchEphemeralCookie();

  return (
    <ClientClerkProvider
      {...mergeNextClerkPropsWithEnv({ ...rest, publishableKey })}
      initialState={state}
    >
      {children}
    </ClientClerkProvider>
  );
}
