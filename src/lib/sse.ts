import ky, { type AfterResponseHook } from 'ky';
import { createParser } from 'eventsource-parser';

export interface SSEOptions {
  onData: (data: string) => void;
  onEvent?: (event: unknown) => void;
  onCompleted?: (error?: Error) => void;
  onAborted?: () => void;
}

export function createSSEHook(options: SSEOptions): AfterResponseHook {
  return async (request, _opts, response) => {
    if (!response.ok || !response.body) return;

    let done = false;
    const finish = (err?: Error) => {
      if (!done) {
        done = true;
        options.onCompleted?.(err);
      }
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf8');
    const parser = createParser({
      onEvent: (event) => {
        if (!event.data) return;
        options.onEvent?.(event);
        for (const chunk of event.data.split('\n')) options.onData(chunk);
      },
    });

    const read = (): void => {
      reader
        .read()
        .then(({ done: streamDone, value }) => {
          if (streamDone) {
            finish();
            return;
          }
          parser.feed(decoder.decode(value, { stream: true }));
          read();
        })
        .catch((err) => {
          if (request.signal.aborted) {
            options.onAborted?.();
            return;
          }
          finish(err as Error);
        });
    };
    read();
    return response;
  };
}

export interface StreamRequestOptions {
  functionUrl: string;
  requestBody: unknown;
  supabaseAnonKey: string;
  onData: (data: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export async function sendStreamRequest(options: StreamRequestOptions): Promise<void> {
  const { functionUrl, requestBody, supabaseAnonKey, onData, onComplete, onError, signal } = options;

  const sseHook = createSSEHook({
    onData,
    onCompleted: (err) => (err ? onError(err) : onComplete()),
    onAborted: () => console.log('Stream aborted'),
  });

  try {
    await ky.post(functionUrl, {
      json: requestBody,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      signal,
      timeout: 45000,
      hooks: { afterResponse: [sseHook] },
    });
  } catch (err) {
    if (!signal?.aborted) onError(err as Error);
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export async function streamGemini(
  contents: GeminiMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  systemPrompt?: string,
  signal?: AbortSignal
): Promise<void> {
  // Create a timeout promise that rejects after 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout - analysis took too long. Please try again.'));
    }, 30000); // 30 second timeout
    
    // Clear timeout if signal is aborted
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  });

  // Race between the actual request and timeout
  try {
    await Promise.race([
      sendStreamRequest({
        functionUrl: `${supabaseUrl}/functions/v1/large-language-model`,
        requestBody: { contents, systemPrompt },
        supabaseAnonKey,
        onData: (data) => {
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (chunk) onChunk(chunk);
          } catch {
            // incomplete chunk, skip
          }
        },
        onComplete: onDone,
        onError,
        signal,
      }),
      timeoutPromise
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      onError(error);
    } else {
      throw error;
    }
  }
}
