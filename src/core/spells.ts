// 스펠 시스템 골격 — 종족 스펠은 Phase 3에서 데이터 정의 (지금은 디스패처만)

import type { GameState } from './state';
import type { Command } from './types';

export type SpellHandler = (state: GameState, cmd: Command) => boolean;

const registry = new Map<string, SpellHandler>();

export function registerSpell(id: string, handler: SpellHandler): void {
  registry.set(id, handler);
}

export function castSpell(state: GameState, cmd: Command): void {
  if (!cmd.spellId) return;
  const handler = registry.get(cmd.spellId);
  if (!handler) return;
  if (handler(state, cmd)) {
    state.counters.spellsCast[cmd.spellId] = (state.counters.spellsCast[cmd.spellId] ?? 0) + 1;
  }
}
