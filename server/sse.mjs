export function createSseHub() {
  const clients = new Set();
  let lastClientTs = Date.now();

  function addClient(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    clients.add(res);
    lastClientTs = Date.now();
    res.on("close", () => {
      clients.delete(res);
      lastClientTs = Date.now();
    });
  }

  function broadcast(event, payload) {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
      try {
        res.write(frame);
      } catch {
        clients.delete(res);
      }
    }
  }

  function clientCount() {
    return clients.size;
  }

  return { addClient, broadcast, clientCount, lastClientTs: () => lastClientTs };
}
