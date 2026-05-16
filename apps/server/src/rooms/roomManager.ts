import { randomUUID } from 'node:crypto';
import type { GameType, MoveIntent, RoomSnapshot } from '@hamrocards/shared';
import type { GameRegistry } from '../engine/registry.js';
import type { GameState, PlayerSeat } from '../engine/types.js';
import type { StateStore } from '../persistence/store.js';

export class RoomManager {
  private readonly rooms = new Map<string, GameState>();
  constructor(private readonly registry: GameRegistry, private readonly store: StateStore) {}

  async createRoom(gameType: GameType, host: { id: string; username: string }): Promise<RoomSnapshot> {
    const roomId = randomUUID();
    const state: GameState = { roomId, gameType, players: [{ ...host, hand: [], connected: true, score: 0 }], deckState: [], currentTurn: host.id, gamePhase: 'waiting', scores: { [host.id]: 0 }, round: 0, history: [], seed: `${roomId}:${Date.now()}`, version: 1, publicState: {} };
    await this.persist(state);
    return this.snapshotFor(state, host.id);
  }

  async joinRoom(roomId: string, player: { id: string; username: string }): Promise<RoomSnapshot> {
    const state = await this.getState(roomId);
    if (state.gamePhase !== 'waiting') throw new Error('Room already started');
    if (!state.players.some((seat) => seat.id === player.id)) state.players.push({ ...player, hand: [], connected: true, score: 0 });
    await this.persist(state);
    return this.snapshotFor(state, player.id);
  }

  async startGame(roomId: string): Promise<GameState> {
    const waiting = await this.getState(roomId);
    const plugin = this.registry.get(waiting.gameType);
    if (waiting.players.length < plugin.minPlayers || waiting.players.length > plugin.maxPlayers) throw new Error(`${waiting.gameType} requires ${plugin.minPlayers}-${plugin.maxPlayers} players`);
    const state = plugin.initGame(roomId, waiting.players, waiting.seed);
    await this.persist(state);
    return state;
  }

  async applyMove(roomId: string, playerId: string, move: MoveIntent): Promise<GameState> {
    const state = await this.getState(roomId);
    const plugin = this.registry.get(state.gameType);
    const before = structuredClone(state) as GameState;
    const result = plugin.applyMove(state, playerId, move);
    if (!result.valid || !result.state) throw new Error(result.reason ?? 'Invalid move');
    try {
      await this.persist(result.state);
      return result.state;
    } catch (error) {
      await this.persist(before);
      throw error;
    }
  }

  async setConnection(roomId: string, playerId: string, connected: boolean, socketId?: string): Promise<GameState> {
    const state = await this.getState(roomId);
    const player = state.players.find((seat) => seat.id === playerId);
    if (player) {
      player.connected = connected;
      player.socketId = socketId;
      if (!connected && state.gamePhase !== 'ended') state.gamePhase = 'paused';
      await this.persist(state);
    }
    return state;
  }

  snapshotFor(state: GameState, playerId: string): RoomSnapshot {
    return { roomId: state.roomId, gameType: state.gameType, players: state.players.map(publicPlayer), currentTurn: state.currentTurn, gamePhase: state.gamePhase, scores: state.scores, round: state.round, history: state.history.slice(-20), hand: state.players.find((player) => player.id === playerId)?.hand ?? [], publicState: state.publicState };
  }

  async getState(roomId: string): Promise<GameState> {
    const state = this.rooms.get(roomId) ?? await this.store.loadLive(roomId);
    if (!state) throw new Error('Room not found');
    this.rooms.set(roomId, state);
    return state;
  }

  private async persist(state: GameState): Promise<void> {
    this.rooms.set(state.roomId, state);
    await this.store.saveLive(state);
    if (state.version % 5 === 0 || state.gamePhase === 'ended') await this.store.backup(state);
  }
}

function publicPlayer(player: PlayerSeat) {
  return { id: player.id, username: player.username, connected: player.connected, cardCount: player.hand.length, score: player.score };
}
