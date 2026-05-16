import type { Card, GameType, MoveIntent } from '@hamrocards/shared';

export interface PlayerSeat {
  id: string;
  username: string;
  hand: Card[];
  connected: boolean;
  score: number;
  socketId?: string;
}

export interface GameState {
  roomId: string;
  gameType: GameType;
  players: PlayerSeat[];
  deckState: Card[];
  currentTurn: string;
  gamePhase: 'waiting' | 'bidding' | 'playing' | 'paused' | 'ended';
  scores: Record<string, number>;
  round: number;
  history: Array<{ playerId: string; move: MoveIntent; at: string }>;
  seed: string;
  version: number;
  publicState: Record<string, unknown>;
}

export interface MoveResult {
  valid: boolean;
  reason?: string;
  state?: GameState;
  events?: Array<{ type: string; payload: unknown }>;
}

export interface GamePlugin {
  type: GameType;
  minPlayers: number;
  maxPlayers: number;
  initGame(roomId: string, players: Array<{ id: string; username: string }>, seed: string): GameState;
  createDeck(): Card[];
  shuffleDeck(deck: Card[], seed: string): Card[];
  dealCards(state: GameState): GameState;
  validateMove(state: GameState, playerId: string, move: MoveIntent): MoveResult;
  applyMove(state: GameState, playerId: string, move: MoveIntent): MoveResult;
  getNextTurn(state: GameState): string;
  checkGameEnd(state: GameState): boolean;
  calculateScore(state: GameState): Record<string, number>;
}
