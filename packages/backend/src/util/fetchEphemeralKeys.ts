import fs from 'node:fs';
import path from 'node:path';

import { isPublishableKey } from '@clerk/shared';
import type { EphemeralKeys } from '@clerk/types';

const buildPath = () => {
  return path.join(process.cwd(), 'node_modules', '.cache', 'clerkjs', 'ephemeral-config.json');
};

const loadKeysFromConfig = () => {
  const config_path = buildPath();

  try {
    const keys: EphemeralKeys = JSON.parse(fs.readFileSync(config_path, 'utf8'));

    // TODO: Add expiration check
    return keys;
  } catch (error) {
    // TODO: Handle file doesn't exist error more gracefully - file will never exist first time we try
    console.error(error);
  }

  return null;
};

const writeKeysToConfig = (keys: EphemeralKeys) => {
  const config_path = buildPath();

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
const fetchNewKeys = async () => {
  return {
    publishableKey: 'pk_test_',
    secretKey: 'sk_test_',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
};

export const fetchEphemeralKeys = async () => {
  const keys = loadKeysFromConfig();
  if (keys) {
    // NOTE: Could use a nicer way to verify valid keys and refetch
    // if there is an issue so users aren't stuck trying to load
    // bad keys.
    if (isPublishableKey(keys.publishableKey)) {
      return keys;
    }
  }

  const newKeys = await fetchNewKeys();
  writeKeysToConfig(newKeys);
  return newKeys;
};
