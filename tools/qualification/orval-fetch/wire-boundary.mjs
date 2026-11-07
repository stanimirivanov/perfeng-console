// Qualification-only adapter. The injected Fetch implementation owns dispatch.
async function readBounded(body, signal, maxBytes) {
  const reader = body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) return Buffer.concat(chunks, length);
      length += value.byteLength;
      if (length > maxBytes) throw Error('response exceeded body limit');
      chunks.push(value);
    }
  } catch (error) {
    cancel();
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

export async function observe(invoke, fetcher, {
  status, validator, requiredHeaders = [], maxBytes = 64 * 1024,
}) {
  const result = await invoke(async (input, init) => {
    const signal = init?.signal;
    signal?.throwIfAborted();
    const response = await fetcher(input, init);
    try {
      signal?.throwIfAborted();
      if (response.status !== status) throw Error('unexpected status');
      for (const header of requiredHeaders) {
        if (!response.headers.get(header)) throw Error('missing header: ' + header);
      }
      if (!validator) {
        if (response.body !== null) throw Error('unexpected response body');
        return response;
      }
      const media = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (media !== 'application/json') throw Error('unexpected media type');
      if (!response.body) throw Error('missing JSON body');
      const bytes = await readBounded(response.body, signal, maxBytes);
      if (!bytes.length) throw Error('missing JSON body');
      return new Response(bytes, { status: response.status, headers: response.headers });
    } catch (error) {
      if (response.body && !response.bodyUsed) void response.body.cancel().catch(() => {});
      throw error;
    }
  });
  const data = validator ? result.data : undefined;
  return { ...result, data, accepted: validator?.(data) ?? true };
}
