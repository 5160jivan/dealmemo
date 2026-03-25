/**
 * Build a useChat-compatible data stream from cached assistant text.
 */

import { formatDataStreamPart } from 'ai';

const CHUNK = 4096;

export function cachedMemoToDataStreamResponse(
  text: string,
  init: ResponseInit & { headers?: Record<string, string> }
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        for (let i = 0; i < text.length; i += CHUNK) {
          const part = formatDataStreamPart('text', text.slice(i, i + CHUNK));
          controller.enqueue(encoder.encode(part));
        }
        controller.enqueue(
          encoder.encode(formatDataStreamPart('finish_message', { finishReason: 'stop' }))
        );
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
  }

  return new Response(stream, {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers,
  });
}
