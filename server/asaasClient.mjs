const defaultBaseByEnv = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/v3',
};

export function resolveAsaasConfig(input = {}) {
  const environment = input.environment === 'production' ? 'production' : 'sandbox';
  const apiKey =
    input.apiKey ||
    process.env.ASAAS_API_KEY ||
    (environment === 'production' ? process.env.ASAAS_API_KEY_PRODUCTION : process.env.ASAAS_API_KEY_SANDBOX);
  const baseUrl = input.baseUrl || process.env.ASAAS_BASE_URL || defaultBaseByEnv[environment];
  return { environment, apiKey, baseUrl };
}

async function asaasFetch(path, { method = 'GET', body, config }) {
  const { apiKey, baseUrl } = config;
  if (!apiKey) {
    return {
      ok: false,
      status: 400,
      error: 'ASAAS_API_KEY_NAO_CONFIGURADA',
      data: null,
    };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.errors?.[0]?.description || `ASAASError ${response.status}`,
        data,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'ERRO_DESCONHECIDO',
      data: null,
    };
  }
}

export async function testConnection(configInput) {
  const config = resolveAsaasConfig(configInput);
  return asaasFetch('/myAccount', { config });
}

export async function createCustomer(payload, configInput) {
  const config = resolveAsaasConfig(configInput);
  return asaasFetch('/customers', {
    method: 'POST',
    body: payload,
    config,
  });
}

export async function createPayment(payload, configInput) {
  const config = resolveAsaasConfig(configInput);
  return asaasFetch('/payments', {
    method: 'POST',
    body: payload,
    config,
  });
}

export async function createSubscription(payload, configInput) {
  const config = resolveAsaasConfig(configInput);
  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: payload,
    config,
  });
}

export async function getPayment(paymentId, configInput) {
  const config = resolveAsaasConfig(configInput);
  return asaasFetch(`/payments/${paymentId}`, { config });
}
