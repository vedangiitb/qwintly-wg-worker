import { WebSocketServer, WebSocket } from "ws";
import { server } from "../../index.js";

export const sessionClients = new Map<string, Set<WebSocket>>();

export async function startWebsocket() {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.pathname.replace("/ws/", "");

    if (!sessionId) {
      ws.close();
      return;
    }

    if (!sessionClients.has(sessionId)) {
      sessionClients.set(sessionId, new Set());
    }
    sessionClients.get(sessionId)!.add(ws);

    console.log(sessionId, `UI connected for session ${sessionId}`);

    ws.on("close", () => {
      sessionClients.get(sessionId)?.delete(ws);
    });
  });
}
