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
  let keys = {
    publishableKey: providerProps.publishableKey,
    secretKey: providerProps.secretKey,
  };

  // TODO: Verify keys are not already set in initialState, or in the cookie
  if (!providerProps.publishableKey) {
    const cookiePublishableKey = cookies().get(constants.QueryParameters.EphemeralPublishableKey)?.value;
    const cookieSecretKey = cookies().get(constants.QueryParameters.EphemeralSecretKey)?.value;
    if (!cookiePublishableKey) {
      keys = await fetchEphemeralKeys();
      redirect(
        `?${constants.QueryParameters.EphemeralPublishableKey}=${keys.publishableKey}&${constants.QueryParameters.EphemeralSecretKey}=${keys.secretKey}`,
      );
    } else {
      keys = {
        publishableKey: cookiePublishableKey,
        secretKey: cookieSecretKey,
      };
    }
  }
  return (
    <ClientClerkProvider
      {...providerProps}
      initialState={state}
      publishableKey={keys.publishableKey}
    >
      {children}
    </ClientClerkProvider>
  );
}
