import { Redis } from '@upstash/redis';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameState } from '../engine/types.js';

export interface StateStore {
  saveLive(state: GameState): Promise<void>;
  loadLive(roomId: string): Promise<GameState | null>;
  backup(state: GameState): Promise<void>;
}

export class HybridFreeTierStore implements StateStore {
  private readonly redis?: Redis;
  private readonly supabase?: SupabaseClient;
  private readonly memory = new Map<string, GameState>();

  constructor(env = process.env) {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
    }
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    }
  }

  async saveLive(state: GameState): Promise<void> {
    this.memory.set(state.roomId, state);
    await this.redis?.set(`room:${state.roomId}`, state, { ex: 60 * 60 * 6 });
  }

  async loadLive(roomId: string): Promise<GameState | null> {
    const cached = this.memory.get(roomId);
    if (cached) return cached;
    const redisState = await this.redis?.get<GameState>(`room:${roomId}`);
    if (redisState) return redisState;
    if (!this.supabase) return null;
    const { data } = await this.supabase.from('game_states').select('state_json').eq('room_id', roomId).maybeSingle();
    return (data?.state_json as GameState | undefined) ?? null;
  }

  async backup(state: GameState): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.from('game_states').upsert({ room_id: state.roomId, state_json: state, updated_at: new Date().toISOString() });
  }
}
