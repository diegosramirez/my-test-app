import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

interface ClientInfo {
  username: string;
  roomId: string;
}

// TODO: Cap stored messages at 1000 per room to prevent unbounded memory growth
const rooms: Map<string, Message[]> = new Map();
rooms.set('general', []);

const clients: Map<WebSocket, ClientInfo> = new Map();

const app = express();
app.use(express.json());

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const messages = rooms.get(req.params.roomId) || [];
  res.json({ messages });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

function broadcast(roomId: string, data: object, exclude?: WebSocket) {
  const msg = JSON.stringify(data);
  for (const [client, info] of clients) {
    if (info.roomId === roomId && client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw: Buffer | string) => {
    let parsed: { type: string; payload: Record<string, unknown> };
    try {
      parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }

    if (parsed.type === 'join') {
      const username = typeof parsed.payload.username === 'string' ? parsed.payload.username.trim() : '';
      const roomId = parsed.payload.roomId;

      if (!username || username.length > 30 || roomId !== 'general') {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid username or room' } }));
        ws.close(4000);
        return;
      }

      clients.set(ws, { username, roomId: roomId as string });

      // Broadcast user_joined to all clients in the room (including joining user)
      const joinMsg = { type: 'user_joined', payload: { username } };
      const joinStr = JSON.stringify(joinMsg);
      for (const [client, info] of clients) {
        if (info.roomId === roomId && client.readyState === WebSocket.OPEN) {
          client.send(joinStr);
        }
      }
    } else if (parsed.type === 'message') {
      const info = clients.get(ws);
      if (!info) return;

      const text = typeof parsed.payload.text === 'string' ? parsed.payload.text.trim() : '';
      if (!text || text.length > 500) return;

      const message: Message = {
        id: crypto.randomUUID(),
        sender: info.username,
        text,
        timestamp: new Date().toISOString(),
      };

      const roomMessages = rooms.get(info.roomId);
      if (roomMessages) {
        roomMessages.push(message);
      }

      // Broadcast to ALL clients including sender
      const envelope = { type: 'message', payload: message };
      const envelopeStr = JSON.stringify(envelope);
      for (const [client, clientInfo] of clients) {
        if (clientInfo.roomId === info.roomId && client.readyState === WebSocket.OPEN) {
          client.send(envelopeStr);
        }
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
