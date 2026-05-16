# 🎮 HamroCards

HamroCards is a zero-cost, free-tier-first, server-authoritative multiplayer card game platform for Nepal and global players. The stack is intentionally limited to free/open-source software and free hosting tiers: React + Vite + Tailwind + Framer Motion on Vercel/Netlify, Node.js + Express + Socket.io on Render/Railway/Fly.io, Supabase Postgres/Auth/Storage, and Upstash Redis.

## Text architecture diagram

```text
Players (browser/mobile web)
  │
  ▼
React + Vite + Tailwind + Framer Motion (Vercel/Netlify free)
  │  Socket.io intents only: bid, play card, draw, bet
  ▼
Node.js + Express + Socket.io (Render/Railway/Fly.io free)
  ├─ RoomManager: create/join/start/reconnect/pause
  ├─ GameRegistry: plugin lookup without core edits
  ├─ GameInterface implementations
  │   ├─ Callbreak: 4 players, bids, tricks, spade trump, follow-suit
  │   ├─ Rummy: 2-6 players, joker, pure-sequence declaration guard
  │   └─ Kitty: betting, blind/reveal, pot state
  ├─ Anti-cheat: server-only state, deterministic seed shuffle, move validation
  └─ Persistence adapter
      ├─ Upstash Redis free tier: live room state and reconnect sync
      └─ Supabase Postgres free tier: backup, crash recovery, match history base
```

## Folder structure

```text
apps/
  server/                 Express + Socket.io authoritative backend
    src/engine/           GameInterface, registry, deterministic RNG
    src/games/callbreak/  Full Callbreak implementation
    src/games/rummy/      Rummy plugin skeleton with declaration validation
    src/games/kitty/      Kitty plugin skeleton with pot/reveal actions
    src/rooms/            Room and matchmaking orchestration
    src/realtime/         Socket.io event handlers
    src/persistence/      Upstash Redis + Supabase adapter
  web/                    React/Vite client table and lobby UI
packages/shared/          Shared cards, snapshots, events and move types
supabase/schema.sql       Free Supabase tables and RLS setup
docs/deployment.md        Free-tier deployment guide
```

## Game plugin contract

Every game module implements `GamePlugin` with `initGame`, `createDeck`, `shuffleDeck`, `dealCards`, `validateMove`, `applyMove`, `getNextTurn`, `checkGameEnd`, and `calculateScore`. To add a future game, create a module that implements the interface and register it in `apps/server/src/index.ts`; no core engine changes are required.

## Socket.io events

HamroCards supports these real-time events: `ROOM_CREATE`, `ROOM_JOIN`, `GAME_START`, `CARD_DEAL`, `PLAYER_MOVE`, `MOVE_VALIDATE`, `TURN_CHANGE`, `GAME_UPDATE`, `GAME_END`, `DISCONNECT`, and `RECONNECT_SYNC`.

## Local development

```bash
npm install
npm run dev:server
npm run dev:web
```

Copy `.env.example` files before connecting Supabase and Upstash. Without those credentials the backend falls back to in-memory state for local development.

## Anti-cheat model

Clients never send authoritative state. They only send move intent. The server owns hands, deck state, current turn, scores, trick state, pot state, and declarations. Invalid cards, turn skipping, fake moves, and rule-breaking declarations are rejected before state mutation. Callbreak shuffling is deterministic from a room seed to support auditing and crash recovery.
