const fs = require('node:fs');
const path = require('node:path');

const { isPublishableKey } = require('@clerk/shared');

const CONFIG_PATH = path.join(process.cwd(), 'node_modules', '.cache', 'clerkjs', 'ephemeral-config.json');

function loadKeysFromConfig() {
  try {
    const keys = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    // TODO: Add expiration check
    return keys;
  } catch (error) {
    // TODO: Handle file doesn't exist error more gracefully - file will never exist first time we try
    console.error(error);
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

// TODO: Replace with call to fetch keys, copy paste your own for now
async function fetchNewKeys() {
  return {
    publishableKey: 'pk_test_',
    secretKey: 'sk_test_',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
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

module.exports.fetchEphemeralKeys = fetchEphemeralKeys;
