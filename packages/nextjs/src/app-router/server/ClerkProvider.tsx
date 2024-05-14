import { constants } from '@clerk/backend/internal';
import type { EphemeralKeys, InitialState, Without } from '@clerk/types';
import * as fs from 'fs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as path from 'path';
import React from 'react';
import xdg from 'xdg-app-paths';

import type { NextClerkProviderProps } from '../../types';
import { mergeNextClerkPropsWithEnv } from '../../utils/mergeNextClerkPropsWithEnv';
import { ClientClerkProvider } from '../client/ClerkProvider';
import { initialState } from './auth';

// TODO: Maybe extract these to common backend logic?
const loadKeysFromConfig = () => {
  const config_dir = xdg.config();
  const config_path = path.join(config_dir, 'clerk', 'config.json');

  try {
    const keys: EphemeralKeys = JSON.parse(fs.readFileSync(config_path, 'utf8'));

    if (keys.expiresAt && keys.expiresAt > Math.floor(Date.now() / 1000)) return keys;
  } catch (error) {
    console.error(error);
  }

  return null;
};

const writeEphemeralKeysToConfig = (keys: EphemeralKeys) => {
  const config_dir = xdg.config();
  const config_path = path.join(config_dir, 'clerk', 'config.json');

  try {
    fs.mkdirSync(path.dirname(config_path), { recursive: true });
    fs.writeFileSync(config_path, JSON.stringify(keys), {
      encoding: 'utf8',
      mode: '0777',
      flag: 'w',
    });
  } catch (error) {
    console.error(error);
  }
};

// TODO: Replace with call to fetch keys, copy paste your own for now
const fetchEphemeralKeys = async () => {
  return {
    publishableKey: 'pk_test_',
    secretKey: 'sk_test_',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
};

const getEphemeralKeys = async () => {
  const keys = loadKeysFromConfig();
  if (keys) return keys;

  const newKeys = await fetchEphemeralKeys();
  writeEphemeralKeysToConfig(newKeys);
  return newKeys;
};

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
      keys = await getEphemeralKeys();
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
