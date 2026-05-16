import type { GamePlugin, GameState, MoveResult } from '../../engine/types.js';
import type { Card, Suit } from '@hamrocards/shared';
import { seededShuffle } from '../../engine/random.js';

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const rummyPlugin: GamePlugin = {
  type: 'rummy', minPlayers: 2, maxPlayers: 6,
  initGame(roomId, players, seed): GameState {
    if (players.length < 2 || players.length > 6) throw new Error('Rummy supports 2-6 players');
    const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    return this.dealCards({ roomId, gameType: 'rummy', players: players.map((p) => ({ ...p, hand: [], connected: true, score: 0 })), deckState: [], currentTurn: players[0].id, gamePhase: 'playing', scores, round: 1, history: [], seed, version: 1, publicState: { joker: `${suits[0]}-${ranks[0]}`, discardPile: [] } });
  },
  createDeck(): Card[] { return [0, 1].flatMap((deckNo) => suits.flatMap((suit) => ranks.map((rank, index) => ({ id: `${deckNo}-${suit}-${rank}`, suit, rank, value: index + 2 })))); },
  shuffleDeck(deck, seed) { return seededShuffle(deck, seed); },
  dealCards(state) { const next = structuredClone(state) as GameState; const deck = this.shuffleDeck(this.createDeck(), state.seed); next.players.forEach((p, i) => { p.hand = deck.slice(i * 13, i * 13 + 13); }); next.deckState = deck.slice(next.players.length * 13); return next; },
  validateMove(state, playerId, move): MoveResult {
    if (state.currentTurn !== playerId) return { valid: false, reason: 'Not your turn' };
    if (move.type === 'DECLARE') {
      const groups = move.payload?.groups as string[][] | undefined;
      if (!groups?.length) return { valid: false, reason: 'Declaration must include grouped cards' };
      const hasPureSequence = groups.some((group) => isPureSequence(group, state.players.find((p) => p.id === playerId)?.hand ?? []));
      return hasPureSequence ? { valid: true } : { valid: false, reason: 'Invalid declaration: at least one pure sequence is required' };
    }
    return ['DRAW', 'DISCARD'].includes(move.type) ? { valid: true } : { valid: false, reason: 'Unsupported Rummy move' };
  },
  applyMove(state, playerId, move) { const validation = this.validateMove(state, playerId, move); if (!validation.valid) return validation; const next = structuredClone(state) as GameState; next.history.push({ playerId, move, at: new Date().toISOString() }); next.version += 1; if (move.type === 'DECLARE') next.gamePhase = 'ended'; next.currentTurn = this.getNextTurn(next); return { valid: true, state: next }; },
  getNextTurn(state) { const order = state.players.map((p) => p.id); return order[(order.indexOf(state.currentTurn) + 1) % order.length]; },
  checkGameEnd(state) { return state.gamePhase === 'ended'; },
  calculateScore(state) { return state.scores; }
};

function isPureSequence(cardIds: string[], hand: Card[]): boolean {
  const cards = cardIds.map((id) => hand.find((card) => card.id === id)).filter(Boolean) as Card[];
  return cards.length >= 3 && cards.every((card) => card.suit === cards[0].suit) && cards.map((card) => card.value).sort((a, b) => a - b).every((value, index, values) => index === 0 || value === values[index - 1] + 1);
}
