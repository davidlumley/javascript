import type { EphemeralKeys, InitialState, Without } from '@clerk/types';
import * as fs from 'fs';
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

  console.log('Trying to load keys from config file: ', config_path);
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

  console.log('Trying to write keys to config file: ', config_path);
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
  if (keys) {
    // TODO: Figure out how to pass these keys to the middleware, maybe a redirect if there's no ephemeral publishable key set as a cookie yet?
    return keys;
  }

  const newKeys = await fetchEphemeralKeys();

  writeEphemeralKeysToConfig(newKeys);
  // TODO: Figure out how to pass these keys to the middleware, maybe a redirect if there's no ephemeral publishable key set as a cookie yet?

  return newKeys;
};

export async function ClerkProvider(
  props: Without<NextClerkProviderProps, '__unstable_invokeMiddlewareOnAuthStateChange'>,
) {
  const { children, ...rest } = props;
  const state = initialState()?.__clerk_ssr_state as InitialState;

  // TODO: Verify keys are not already set in initialState, or in the cookie
  const keys = await getEphemeralKeys();
  return (
    <ClientClerkProvider
      {...mergeNextClerkPropsWithEnv(rest)}
      initialState={state}
      publishableKey={keys.publishableKey}
    >
      {children}
    </ClientClerkProvider>
  );
}
