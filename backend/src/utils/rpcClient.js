function getRpcUrls(chainConfig) {
  return [
    ...(Array.isArray(chainConfig?.rpcUrls) ? chainConfig.rpcUrls : []),
    chainConfig?.rpcUrl
  ].filter((url, index, urls) => url && urls.indexOf(url) === index);
}

async function postJsonRpc(rpcUrl, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      }),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 160)}`);
    }

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestJsonRpcWithFallback(chainConfig, method, params) {
  const rpcUrls = getRpcUrls(chainConfig);
  const errors = [];

  for (const rpcUrl of rpcUrls) {
    try {
      const result = await postJsonRpc(rpcUrl, method, params);
      if (rpcUrl !== rpcUrls[0]) {
        console.warn(`[RPC] ${method} succeeded via fallback RPC: ${rpcUrl}`);
      }
      return result;
    } catch (error) {
      errors.push(`${rpcUrl}: ${error.message}`);
      console.warn(`[RPC] ${method} failed on ${rpcUrl}: ${error.message}`);
    }
  }

  throw new Error(`All RPC endpoints failed for ${method}: ${errors.join(' | ')}`);
}
