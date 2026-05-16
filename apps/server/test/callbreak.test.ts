import { describe, expect, it } from 'vitest';
import { callbreakPlugin } from '../src/games/callbreak/callbreak.js';

const players = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, username: id }));

describe('callbreakPlugin', () => {
  it('deals 13 cards to each of four players deterministically', () => {
    const first = callbreakPlugin.initGame('room', players, 'seed');
    const second = callbreakPlugin.initGame('room', players, 'seed');
    expect(first.players.every((player) => player.hand.length === 13)).toBe(true);
    expect(first.players[0].hand.map((card) => card.id)).toEqual(second.players[0].hand.map((card) => card.id));
  });

  it('rejects fake cards and out-of-turn plays', () => {
    let state = callbreakPlugin.initGame('room', players, 'seed');
    for (const player of players) state = callbreakPlugin.applyMove(state, player.id, { type: 'BID', payload: { bid: 3 } }).state!;
    expect(callbreakPlugin.validateMove(state, 'p2', { type: 'PLAY_CARD', cardIds: [state.players[1].hand[0].id] }).valid).toBe(false);
    expect(callbreakPlugin.validateMove(state, 'p1', { type: 'PLAY_CARD', cardIds: ['spades-A-fake'] }).valid).toBe(false);
  });

  it('enforces following the lead suit when possible', () => {
    let state = callbreakPlugin.initGame('room', players, 'follow-seed');
    for (const player of players) state = callbreakPlugin.applyMove(state, player.id, { type: 'BID', payload: { bid: 2 } }).state!;
    const leader = state.players[0];
    const lead = leader.hand[0];
    state = callbreakPlugin.applyMove(state, 'p1', { type: 'PLAY_CARD', cardIds: [lead.id] }).state!;
    const follower = state.players[1];
    const sameSuit = follower.hand.find((card) => card.suit === lead.suit);
    const otherSuit = follower.hand.find((card) => card.suit !== lead.suit);
    if (sameSuit && otherSuit) expect(callbreakPlugin.validateMove(state, 'p2', { type: 'PLAY_CARD', cardIds: [otherSuit.id] }).valid).toBe(false);
  });
});
