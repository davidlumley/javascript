const fs = require('node:fs');
const path = require('node:path');

const { isPublishableKey } = require('@clerk/shared');

async function fetchEphemeralKeys() {
  const ephemeralAccount = read();

  if (ephemeralAccount) {
    // NOTE: Could use a nicer way to verify valid keys and refetch
    // if there is an issue so users aren't stuck trying to load
    // bad keys.
    if (isPublishableKey(ephemeralAccount.publishableKey)) {
      return ephemeralAccount;
    }
  }

  const newEphemeralAccount = await create();

  if (isPublishableKey(newEphemeralAccount.publishableKey)) {
    save(newEphemeralAccount);
    return newEphemeralAccount;
  }

  // TODO: Handle 204, 4xx and 5xx HTTP status codes.
}

const PATH = path.join(process.cwd(), 'node_modules', '.cache', 'clerkjs', 'ephemeral-config.json');

function read() {
  try {
    if (fs.existsSync(PATH)) {
      const config = JSON.parse(fs.readFileSync(PATH, { encoding: 'utf-8' }));
      const { expiresAt } = config;

      if (expiresAt < now()) {
        return null;
      }

      return config;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return null;
    }

    throw error;
  }
}

function save(ephemeralAccount) {
  try {
    fs.mkdirSync(path.dirname(PATH), { recursive: true });

    const content = JSON.stringify(ephemeralAccount);

    fs.writeFileSync(PATH, content, {
      encoding: 'utf8',
      mode: '0777',
      flag: 'w',
    });
  } catch (error) {
    console.error(error);
  }
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

async function create() {
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
