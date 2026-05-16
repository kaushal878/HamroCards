import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { GameRegistry } from './engine/registry.js';
import { callbreakPlugin } from './games/callbreak/callbreak.js';
import { rummyPlugin } from './games/rummy/rummy.js';
import { kittyPlugin } from './games/kitty/kitty.js';
import { HybridFreeTierStore } from './persistence/store.js';
import { RoomManager } from './rooms/roomManager.js';
import { attachSocketServer } from './realtime/socketServer.js';
import { env } from './config/env.js';

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

const registry = new GameRegistry();
registry.register(callbreakPlugin);
registry.register(rummyPlugin);
registry.register(kittyPlugin);
const roomManager = new RoomManager(registry, new HybridFreeTierStore());

app.get('/health', (_req, res) => res.json({ ok: true, games: registry.list(), stack: ['Express', 'Socket.io', 'Supabase free tier', 'Upstash Redis free tier'] }));

const server = http.createServer(app);
attachSocketServer(server, roomManager, env.CORS_ORIGIN);
server.listen(env.PORT, () => console.log(`HamroCards server listening on :${env.PORT}`));
