// Qualification-only adapter. The injected Fetch implementation owns dispatch.
/**
 * Collect a qualification response under the byte limit and cancel on abort or failure.
 * @param {ReadableStream<Uint8Array>} body - Response stream owned by the caller.
 * @param {AbortSignal|undefined} signal - Caller cancellation signal.
 * @param {number} maxBytes - Inclusive maximum body byte count.
 * @returns {Promise<Buffer>} Completed bounded response bytes.
 * @throws {Error} If the stream fails, is aborted or exceeds its limit; its reader is always released.
 */
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

/**
 * Qualify a generated invocation against expected wire status, headers and an Ajv oracle.
 * @param {(fetcher: typeof fetch) => Promise<object>} invoke - Generated invocation accepting the instrumented Fetch function.
 * @param {typeof fetch} fetcher - Isolated caller-owned dispatch implementation.
 * @param {object} options - Predeclared wire and schema expectations.
 * @param {number} options.status - Exact accepted response status.
 * @param {(data: unknown) => boolean} [options.validator] - Ajv oracle for decoded data; absent means a bodyless response.
 * @param {string[]} [options.requiredHeaders] - Headers whose nonempty values must survive transport.
 * @param {number} [options.maxBytes] - Inclusive response limit, defaulting to sixty-four KiB.
 * @returns {Promise<object>} Generated result plus accepted flag from the independent validator.
 * @throws {Error} If status/media/header/body or cancellation expectations fail.
 */
export async function observe(invoke, fetcher, {
  status,
  validator,
  requiredHeaders = [],
  maxBytes = 64 * 1024,
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
