import type { GamePlugin } from './types.js';
import type { GameType } from '@hamrocards/shared';

export class GameRegistry {
  private readonly plugins = new Map<GameType, GamePlugin>();

  register(plugin: GamePlugin): void {
    if (this.plugins.has(plugin.type)) throw new Error(`Game plugin already registered: ${plugin.type}`);
    this.plugins.set(plugin.type, plugin);
  }

  get(type: GameType): GamePlugin {
    const plugin = this.plugins.get(type);
    if (!plugin) throw new Error(`Unsupported game type: ${type}`);
    return plugin;
  }

  list(): GameType[] {
    return [...this.plugins.keys()];
  }
}
