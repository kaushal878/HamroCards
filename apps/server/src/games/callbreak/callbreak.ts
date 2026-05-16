import type { Card, MoveIntent, Suit } from '@hamrocards/shared';
import { seededShuffle } from '../../engine/random.js';
import type { GamePlugin, GameState, MoveResult } from '../../engine/types.js';

const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
const trump: Suit = 'spades';

interface CallbreakPublicState {
  trump: Suit;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  currentTrick: Array<{ playerId: string; card: Card }>;
  trickLeader: string;
}

function publicState(state: GameState): CallbreakPublicState {
  return state.publicState as unknown as CallbreakPublicState;
}

function cloneState(state: GameState): GameState {
  return structuredClone(state) as GameState;
}

function cardBeats(candidate: Card, currentBest: Card, leadSuit: Suit): boolean {
  if (candidate.suit === currentBest.suit) return candidate.value > currentBest.value;
  if (candidate.suit === trump && currentBest.suit !== trump) return true;
  if (candidate.suit !== trump && currentBest.suit === trump) return false;
  return candidate.suit === leadSuit && currentBest.suit !== leadSuit;
}

function currentWinner(trick: Array<{ playerId: string; card: Card }>): string {
  const leadSuit = trick[0].card.suit;
  return trick.reduce((best, play) => (cardBeats(play.card, best.card, leadSuit) ? play : best)).playerId;
}

export const callbreakPlugin: GamePlugin = {
  type: 'callbreak',
  minPlayers: 4,
  maxPlayers: 4,

  initGame(roomId, players, seed) {
    if (players.length !== 4) throw new Error('Callbreak requires exactly 4 players');
    const scores = Object.fromEntries(players.map((player) => [player.id, 0]));
    const state: GameState = {
      roomId,
      gameType: 'callbreak',
      players: players.map((player) => ({ ...player, hand: [], connected: true, score: 0 })),
      deckState: [],
      currentTurn: players[0].id,
      gamePhase: 'bidding',
      scores,
      round: 1,
      history: [],
      seed,
      version: 1,
      publicState: { trump, bids: {}, tricksWon: scores, currentTrick: [], trickLeader: players[0].id }
    };
    return this.dealCards(state);
  },

  createDeck() {
    return suits.flatMap((suit) => ranks.map((rank, index) => ({ id: `${suit}-${rank}`, suit, rank, value: index + 2 })));
  },

  shuffleDeck(deck, seed) {
    return seededShuffle(deck, seed);
  },

  dealCards(state) {
    const next = cloneState(state);
    const deck = this.shuffleDeck(this.createDeck(), next.seed);
    next.deckState = [];
    next.players.forEach((player, playerIndex) => {
      player.hand = deck.filter((_, cardIndex) => cardIndex % 4 === playerIndex).sort((a, b) => a.suit.localeCompare(b.suit) || a.value - b.value);
    });
    return next;
  },

  validateMove(state, playerId, move) {
    if (state.gamePhase !== 'bidding' && state.gamePhase !== 'playing') return { valid: false, reason: 'Game is not accepting moves' };
    if (state.currentTurn !== playerId) return { valid: false, reason: 'Not your turn' };
    const player = state.players.find((seat) => seat.id === playerId);
    if (!player) return { valid: false, reason: 'Player is not seated' };

    const ps = publicState(state);
    if (state.gamePhase === 'bidding') {
      const bid = Number(move.payload?.bid);
      if (move.type !== 'BID' || !Number.isInteger(bid) || bid < 1 || bid > 13) return { valid: false, reason: 'Bid must be an integer from 1 to 13' };
      return { valid: true };
    }

    if (move.type !== 'PLAY_CARD' || move.cardIds?.length !== 1) return { valid: false, reason: 'Exactly one card must be played' };
    const card = player.hand.find((candidate) => candidate.id === move.cardIds?.[0]);
    if (!card) return { valid: false, reason: 'Card is not in player hand' };
    const leadSuit = ps.currentTrick[0]?.card.suit;
    if (leadSuit && card.suit !== leadSuit && player.hand.some((candidate) => candidate.suit === leadSuit)) {
      return { valid: false, reason: `Must follow ${leadSuit}` };
    }
    return { valid: true };
  },

  applyMove(state, playerId, move) {
    const validation = this.validateMove(state, playerId, move);
    if (!validation.valid) return validation;

    const next = cloneState(state);
    const ps = publicState(next);
    next.history.push({ playerId, move, at: new Date().toISOString() });
    next.version += 1;

    if (next.gamePhase === 'bidding') {
      ps.bids[playerId] = Number(move.payload?.bid);
      const order = next.players.map((player) => player.id);
      const currentIndex = order.indexOf(playerId);
      const allBid = order.every((id) => Number.isInteger(ps.bids[id]));
      if (allBid) {
        next.gamePhase = 'playing';
        next.currentTurn = ps.trickLeader;
      } else {
        next.currentTurn = order[(currentIndex + 1) % order.length];
      }
      return { valid: true, state: next, events: [{ type: 'MOVE_VALIDATE', payload: { ok: true } }] };
    }

    const player = next.players.find((seat) => seat.id === playerId)!;
    const cardIndex = player.hand.findIndex((card) => card.id === move.cardIds![0]);
    const [card] = player.hand.splice(cardIndex, 1);
    ps.currentTrick.push({ playerId, card });

    if (ps.currentTrick.length === 4) {
      const winnerId = currentWinner(ps.currentTrick);
      ps.tricksWon[winnerId] = (ps.tricksWon[winnerId] ?? 0) + 1;
      ps.currentTrick = [];
      ps.trickLeader = winnerId;
      next.currentTurn = winnerId;
      next.scores = this.calculateScore(next);
      if (this.checkGameEnd(next)) next.gamePhase = 'ended';
    } else {
      next.currentTurn = this.getNextTurn(next);
    }

    return { valid: true, state: next, events: [{ type: 'MOVE_VALIDATE', payload: { ok: true } }] };
  },

  getNextTurn(state) {
    const order = state.players.map((player) => player.id);
    const currentIndex = order.indexOf(state.currentTurn);
    return order[(currentIndex + 1) % order.length];
  },

  checkGameEnd(state) {
    return state.players.every((player) => player.hand.length === 0);
  },

  calculateScore(state) {
    const ps = publicState(state);
    return Object.fromEntries(state.players.map((player) => {
      const bid = ps.bids[player.id] ?? 0;
      const won = ps.tricksWon[player.id] ?? 0;
      return [player.id, won >= bid ? bid + (won - bid) * 0.1 : -bid];
    }));
  }
};
