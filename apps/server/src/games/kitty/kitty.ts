import type { GamePlugin, GameState } from '../../engine/types.js';
import type { Card, Suit } from '@hamrocards/shared';
import { seededShuffle } from '../../engine/random.js';

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const kittyPlugin: GamePlugin = {
  type: 'kitty', minPlayers: 2, maxPlayers: 6,
  initGame(roomId, players, seed): GameState {
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    return this.dealCards({ roomId, gameType: 'kitty', players: players.map((p) => ({ ...p, hand: [], connected: true, score: 0 })), deckState: [], currentTurn: players[0].id, gamePhase: 'playing', scores, round: 1, history: [], seed, version: 1, publicState: { pot: 0, blind: true, revealed: [] } });
  },
  createDeck(): Card[] { return suits.flatMap((suit) => ranks.map((rank, index) => ({ id: `${suit}-${rank}`, suit, rank, value: index + 2 }))); },
  shuffleDeck(deck, seed) { return seededShuffle(deck, seed); },
  dealCards(state) { const next = structuredClone(state) as GameState; const deck = this.shuffleDeck(this.createDeck(), state.seed); next.players.forEach((p, i) => { p.hand = deck.slice(i * 3, i * 3 + 3); }); next.deckState = deck.slice(next.players.length * 3); return next; },
  validateMove(state, playerId, move) { if (state.currentTurn !== playerId) return { valid: false, reason: 'Not your turn' }; return ['BET', 'FOLD', 'REVEAL'].includes(move.type) ? { valid: true } : { valid: false, reason: 'Unsupported Kitty move' }; },
  applyMove(state, playerId, move) { const validation = this.validateMove(state, playerId, move); if (!validation.valid) return validation; const next = structuredClone(state) as GameState; const ps = next.publicState as { pot: number; revealed: string[] }; if (move.type === 'BET') ps.pot += Number(move.payload?.amount ?? 0); if (move.type === 'REVEAL') ps.revealed.push(playerId); next.history.push({ playerId, move, at: new Date().toISOString() }); next.version += 1; next.currentTurn = this.getNextTurn(next); return { valid: true, state: next }; },
  getNextTurn(state) { const order = state.players.map((p) => p.id); return order[(order.indexOf(state.currentTurn) + 1) % order.length]; },
  checkGameEnd(state) { return state.gamePhase === 'ended'; },
  calculateScore(state) { return state.scores; }
};
