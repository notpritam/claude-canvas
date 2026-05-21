type Handler = (data: unknown) => void;

export function createSseClient() {
  let source: EventSource | null = null;
  const handlers = new Map<string, Set<Handler>>();
  let backoff = 500;

  function connect() {
    source?.close();
    source = new EventSource("/api/events");
    source.onopen = () => {
      backoff = 500;
    };
    source.onerror = () => {
      source?.close();
      source = null;
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 8000);
    };
    for (const [event, set] of handlers) {
      source.addEventListener(event, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          set.forEach((h) => h(data));
        } catch {
          /* ignore */
        }
      });
    }
  }

  function on(event: string, handler: Handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    source?.addEventListener(event, (e) => {
      try {
        handler(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore */
      }
    });
    return () => handlers.get(event)?.delete(handler);
  }

  function close() {
    source?.close();
    source = null;
  }

  return { connect, on, close };
}
