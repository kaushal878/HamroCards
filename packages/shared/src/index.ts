export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type GameType = 'callbreak' | 'rummy' | 'kitty';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface PlayerPublic {
  id: string;
  username: string;
  connected: boolean;
  cardCount: number;
  score: number;
}

export interface MoveIntent {
  type: string;
  cardIds?: string[];
  payload?: Record<string, unknown>;
  clientMoveId?: string;
}

export interface RoomSnapshot {
  roomId: string;
  gameType: GameType;
  players: PlayerPublic[];
  currentTurn?: string;
  gamePhase: string;
  scores: Record<string, number>;
  round: number;
  history: Array<{ playerId: string; move: MoveIntent; at: string }>;
  hand?: Card[];
  publicState: Record<string, unknown>;
}

export const SOCKET_EVENTS = {
  ROOM_CREATE: 'ROOM_CREATE',
  ROOM_JOIN: 'ROOM_JOIN',
  GAME_START: 'GAME_START',
  CARD_DEAL: 'CARD_DEAL',
  PLAYER_MOVE: 'PLAYER_MOVE',
  MOVE_VALIDATE: 'MOVE_VALIDATE',
  TURN_CHANGE: 'TURN_CHANGE',
  GAME_UPDATE: 'GAME_UPDATE',
  GAME_END: 'GAME_END',
  DISCONNECT: 'DISCONNECT',
  RECONNECT_SYNC: 'RECONNECT_SYNC'
} as const;
