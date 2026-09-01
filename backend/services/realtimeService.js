/**
 * Real-time Server-Sent Events (SSE) Manager
 * Manages client SSE connections and broadcasts events when DB changes occur.
 */

let clients = [];

/**
 * SSE Connection Handler middleware
 */
const sseHandler = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial handshake ping
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    clients = clients.filter((c) => c.id !== clientId);
  });
};

/**
 * Broadcast event update to all connected SSE clients
 */
const broadcastRealtimeEvent = (eventType, payload = {}) => {
  const dataString = `data: ${JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() })}\n\n`;
  clients.forEach((c) => {
    try {
      c.res.write(dataString);
    } catch (err) {
      // client connection likely dropped
    }
  });
};

module.exports = {
  sseHandler,
  broadcastRealtimeEvent,
};
