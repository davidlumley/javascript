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
  if (isPublishableKey(newKeys.publishableKey)) {
    writeKeysToConfig(newKeys);
    return newKeys;
  }

  // TODO: Handle 204, 4xx and 5xx HTTP status codes.
}

/**
 * Example demo instance payload:
 *
 * {
 *   object: "demo_dev_instance",
 *   frontend_api_key: "pk_test_****************************************************",
 *   backend_api_key: "sk_test_******************************************",
 *   jwt_verification_key: "********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************",
 *   accounts_url: "https://******-*******-**.accountsstage.dev"
 * }
 */

async function fetchNewKeys() {
  const demo = await postJSON('https://api.clerkstage.dev/v1/public/demo_instance');

  return {
    publishableKey: demo.frontend_api_key,
    secretKey: demo.backend_api_key,
    expiresAt: daysFromNow(1),
  };
}

function now() {
  return daysFromNow(0);
}

function daysFromNow(days) {
  return Math.floor(Date.now() / 1000) + 60 * 60 * 24 * days;
}

function postJSON(url, body) {
  return apiResult(
    fetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

async function apiResult(whenResponse) {
  const response = await whenResponse;

  if (response.status === 204) {
    return null;
  } else if (response.ok) {
    const body = await response.json();
    return body;
  } else if (response.status >= 400 && response.status < 500) {
    const body = await response.json();
    const error = new ClientError(response.statusText, response.status, body);
    throw error;
  } else {
    const error = new ServerError(response.statusText, response.status);
    throw error;
  }
}

class ClientError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.name = 'ClientError';
    this.body = body;
  }
}

class ServerError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ServerError';
  }
}

module.exports.fetchEphemeralKeys = fetchEphemeralKeys;
