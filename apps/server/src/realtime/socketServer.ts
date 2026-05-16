import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { SOCKET_EVENTS, type GameType, type MoveIntent } from '@hamrocards/shared';
import type { RoomManager } from '../rooms/roomManager.js';
import type { GameState } from '../engine/types.js';

const playerSchema = z.object({ playerId: z.string().min(1), username: z.string().min(1) });
const roomSchema = playerSchema.extend({ roomId: z.string().uuid() });

export function attachSocketServer(httpServer: HttpServer, roomManager: RoomManager, corsOrigin: string) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

  io.on('connection', (socket) => {
    socket.on(SOCKET_EVENTS.ROOM_CREATE, async (payload: { gameType: GameType; playerId: string; username: string }, ack) => {
      try {
        const player = playerSchema.parse(payload);
        const snapshot = await roomManager.createRoom(payload.gameType, { id: player.playerId, username: player.username });
        await socket.join(snapshot.roomId);
        await roomManager.setConnection(snapshot.roomId, player.playerId, true, socket.id);
        socket.data.roomId = snapshot.roomId;
        socket.data.playerId = player.playerId;
        ack?.({ ok: true, snapshot });
      } catch (error) { ack?.({ ok: false, error: errorMessage(error) }); }
    });

    socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload: { roomId: string; playerId: string; username: string }, ack) => {
      try {
        const parsed = roomSchema.parse(payload);
        const snapshot = await roomManager.joinRoom(parsed.roomId, { id: parsed.playerId, username: parsed.username });
        await socket.join(parsed.roomId);
        const state = await roomManager.setConnection(parsed.roomId, parsed.playerId, true, socket.id);
        socket.data.roomId = parsed.roomId;
        socket.data.playerId = parsed.playerId;
        emitPrivateSnapshots(io, roomManager, state);
        ack?.({ ok: true, snapshot: roomManager.snapshotFor(state, parsed.playerId) });
      } catch (error) { ack?.({ ok: false, error: errorMessage(error) }); }
    });

    socket.on(SOCKET_EVENTS.GAME_START, async (payload: { roomId: string }, ack) => {
      try {
        const state = await roomManager.startGame(payload.roomId);
        emitPrivateSnapshots(io, roomManager, state, SOCKET_EVENTS.CARD_DEAL);
        io.to(payload.roomId).emit(SOCKET_EVENTS.TURN_CHANGE, { currentTurn: state.currentTurn });
        ack?.({ ok: true });
      } catch (error) { ack?.({ ok: false, error: errorMessage(error) }); }
    });

    socket.on(SOCKET_EVENTS.PLAYER_MOVE, async (payload: { roomId: string; playerId: string; move: MoveIntent }, ack) => {
      try {
        const state = await roomManager.applyMove(payload.roomId, payload.playerId, payload.move);
        socket.emit(SOCKET_EVENTS.MOVE_VALIDATE, { ok: true, clientMoveId: payload.move.clientMoveId });
        emitPrivateSnapshots(io, roomManager, state);
        io.to(payload.roomId).emit(SOCKET_EVENTS.TURN_CHANGE, { currentTurn: state.currentTurn });
        if (state.gamePhase === 'ended') io.to(payload.roomId).emit(SOCKET_EVENTS.GAME_END, { scores: state.scores });
        ack?.({ ok: true });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.MOVE_VALIDATE, { ok: false, error: errorMessage(error), clientMoveId: payload.move?.clientMoveId });
        ack?.({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT_SYNC, async (payload: { roomId: string; playerId: string }, ack) => {
      try {
        const state = await roomManager.setConnection(payload.roomId, payload.playerId, true, socket.id);
        await socket.join(payload.roomId);
        socket.data.roomId = payload.roomId;
        socket.data.playerId = payload.playerId;
        ack?.({ ok: true, snapshot: roomManager.snapshotFor(state, payload.playerId) });
      } catch (error) { ack?.({ ok: false, error: errorMessage(error) }); }
    });

    socket.on('disconnect', async () => {
      const { roomId, playerId } = socket.data as { roomId?: string; playerId?: string };
      if (!roomId || !playerId) return;
      try {
        const state = await roomManager.setConnection(roomId, playerId, false);
        io.to(roomId).emit(SOCKET_EVENTS.DISCONNECT, { playerId });
        emitPrivateSnapshots(io, roomManager, state);
      } catch {
        // The socket may disconnect after a room is already reclaimed; no client recovery is possible here.
      }
    });
  });

  return io;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown server error';
}

function emitPrivateSnapshots(io: Server, roomManager: RoomManager, state: GameState, event: string = SOCKET_EVENTS.GAME_UPDATE): void {
  for (const player of state.players) {
    if (player.socketId) io.to(player.socketId).emit(event, roomManager.snapshotFor(state, player.id));
  }
}
