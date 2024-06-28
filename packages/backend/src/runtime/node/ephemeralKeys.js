const fs = require('node:fs');
const path = require('node:path');

const { isPublishableKey } = require('@clerk/shared');

const CONFIG_PATH = path.join(process.cwd(), 'node_modules', '.cache', 'clerkjs', 'ephemeral-config.json');

function loadKeysFromConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, { encoding: 'utf-8' }));
      const { expiresAt, ...keys } = config;

      if (expiresAt < now()) {
        return null;
      }

      return keys;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return null;
    }

    throw error;
  }

  return null;
}

function writeKeysToConfig(keys) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(keys), {
      encoding: 'utf8',
      mode: '0777',
      flag: 'w',
    });
  } catch (error) {
    console.error(error);
  }
}

async function fetchEphemeralKeys() {
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
}

// TODO: Replace with call to fetch keys, copy paste your own for now
async function fetchNewKeys() {
  return {
    publishableKey: 'pk_test_',
    secretKey: 'sk_test_',
    expiresAt: daysFromNow(1),
  };
}

function now() {
  return daysFromNow(0);
}

function daysFromNow(days) {
  return Math.floor(Date.now() / 1000) + 60 * 60 * 24 * days;
}

module.exports.fetchEphemeralKeys = fetchEphemeralKeys;
