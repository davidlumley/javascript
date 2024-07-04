const fs = require('node:fs');
const path = require('node:path');

const { isPublishableKey } = require('@clerk/shared');

async function fetchEphemeralKeys() {
  let config = read();

  if (config) {
    const verified = await verify(config);

    if (verified) {
      return config;
    }
  }

  config = await create();
  save(config);

  return config;
}

const PATH = path.join(process.cwd(), 'node_modules', '.cache', 'clerkjs', 'ephemeral.json');

function read() {
  try {
    if (fs.existsSync(PATH)) {
      const config = JSON.parse(fs.readFileSync(PATH, { encoding: 'utf-8' }));

      if (config.expiresAt < now()) {
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

async function verify(config) {
  try {
    // TODO: endpoint is not implemented yet.
    //
    // await postJSON('https://api.clerkstage.dev/v1/ephemeral-account/verify', {
    //   publishable_key: config.publishableKey,
    //   secret_key: config.secretKey,
    // })
    //
    // return true

    if (!isPublishableKey(config.publishableKey)) {
      return false;
    }

    // NOTE: Simulate failed verification after 15 minutes
    if (config.expiresAt < daysFromNow(1) - 60 * 15) {
      return false;
    }

    return true;
  } catch (err) {
    if (err instanceof ClientError) {
      return false;
    }

    throw err;
  }
}

function save(config) {
  fs.mkdirSync(path.dirname(PATH), { recursive: true });

  const content = JSON.stringify(config);

  fs.writeFileSync(PATH, content, {
    encoding: 'utf8',
    mode: '0777',
    flag: 'w',
  });
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
