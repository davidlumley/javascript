import { constants, fetchEphemeralKeys } from '@clerk/backend/internal';
import type { InitialState, Without } from '@clerk/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';

import type { NextClerkProviderProps } from '../../types';
import { mergeNextClerkPropsWithEnv } from '../../utils/mergeNextClerkPropsWithEnv';
import { ClientClerkProvider } from '../client/ClerkProvider';
import { initialState } from './auth';

export async function ClerkProvider(
  props: Without<NextClerkProviderProps, '__unstable_invokeMiddlewareOnAuthStateChange'>,
) {
  const { children, ...rest } = props;
  const state = initialState()?.__clerk_ssr_state as InitialState;

  const providerProps = { ...mergeNextClerkPropsWithEnv(rest) };

  if (!providerProps.publishableKey) {
    const keys = await fetchEphemeralKeys();
    const params = new URLSearchParams();
    const cookiePublishableKey = cookies().get(constants.QueryParameters.EphemeralPublishableKey)?.value;
    const cookieSecretKey = cookies().get(constants.QueryParameters.EphemeralSecretKey)?.value;

    if (!cookiePublishableKey || cookiePublishableKey !== keys.publishableKey) {
      params.set(constants.QueryParameters.EphemeralPublishableKey, keys.publishableKey);
    }

    if (!cookieSecretKey || cookieSecretKey !== keys.secretKey) {
      params.set(constants.QueryParameters.EphemeralSecretKey, keys.secretKey);
    }

    if (params.size === 2) {
      redirect(`?${params}`);
    }

    providerProps.ephemeral = true;
    providerProps.publishableKey = keys.publishableKey;
  }

  return (
    <ClientClerkProvider
      {...providerProps}
      initialState={state}
    >
      {children}
    </ClientClerkProvider>
  );
}
