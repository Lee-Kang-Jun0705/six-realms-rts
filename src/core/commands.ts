// 명령 적용 — 플레이어 UI/AI 공용 진입점 (리플레이 = 시드 + 명령 로그)

import type { GameState } from './state';
import { findBuilding, findMine, findUnit } from './state';
import type { Command, Unit } from './types';
import { placeBuilding } from './building';
import { queueTierUp, queueUpgrade, trainUnit } from './production';
import { T_FOREST, tileIndex, inBounds } from './map';
import { castSpell } from './spells';

export function applyCommand(state: GameState, cmd: Command): void {
  switch (cmd.type) {
    case 'move':
    case 'attackMove':
      return applyMove(state, cmd);
    case 'stop':
      return applyStop(state, cmd);
    case 'harvest':
      return applyHarvest(state, cmd);
    case 'build':
      return applyBuild(state, cmd);
    case 'train': {
      const b = cmd.buildingId ? findBuilding(state, cmd.buildingId) : undefined;
      if (b && b.player === cmd.player && cmd.unitRole) trainUnit(state, b, cmd.unitRole);
      return;
    }
    case 'tierUp': {
      const b = cmd.buildingId ? findBuilding(state, cmd.buildingId) : undefined;
      if (b && b.player === cmd.player) queueTierUp(state, b);
      return;
    }
    case 'upgrade': {
      const b = cmd.buildingId ? findBuilding(state, cmd.buildingId) : undefined;
      if (b && b.player === cmd.player && cmd.upgradeId) queueUpgrade(state, b, cmd.upgradeId);
      return;
    }
    case 'cast':
      return castSpell(state, cmd);
    case 'surrender':
      state.players[cmd.player].defeated = true;
      return;
  }
}

/** 소유+생존 유닛만 (매혹된 적 유닛은 매혹자가 조종) */
function ownedUnits(state: GameState, cmd: Command): Unit[] {
  const out: Unit[] = [];
  for (const id of cmd.unitIds ?? []) {
    const u = findUnit(state, id);
    if (!u) continue;
    const controller = u.charmOwner >= 0 ? u.charmOwner : u.player;
    if (controller === cmd.player) out.push(u);
  }
  return out;
}

function applyMove(state: GameState, cmd: Command): void {
  if (cmd.x === undefined || cmd.y === undefined) return;
  for (const u of ownedUnits(state, cmd)) {
    u.state = cmd.type === 'move' ? 'moving' : 'attackMove';
    u.destX = cmd.x;
    u.destY = cmd.y;
    u.orderX = cmd.x;
    u.orderY = cmd.y;
    u.targetId = cmd.targetId ?? 0;
    u.windup = 0;
    if (cmd.targetId) u.state = 'attacking';
  }
}

function applyStop(state: GameState, cmd: Command): void {
  for (const u of ownedUnits(state, cmd)) {
    u.state = 'idle';
    u.destX = u.x;
    u.destY = u.y;
    u.targetId = 0;
    u.windup = 0;
  }
}

function applyHarvest(state: GameState, cmd: Command): void {
  for (const u of ownedUnits(state, cmd)) {
    if (u.role !== 'worker') continue;
    if (cmd.targetId && findMine(state, cmd.targetId)) {
      u.harvestTargetId = cmd.targetId;
      u.forestX = -1;
      u.forestY = -1;
      u.state = 'harvesting';
    } else if (cmd.x !== undefined && cmd.y !== undefined) {
      const tx = Math.floor(cmd.x);
      const ty = Math.floor(cmd.y);
      if (!inBounds(state.map, tx, ty)) continue;
      if (state.map.terrain[tileIndex(state.map, tx, ty)] !== T_FOREST) continue;
      u.harvestTargetId = 0;
      u.forestX = tx;
      u.forestY = ty;
      u.state = 'harvesting';
    }
    u.harvestTicks = 0;
  }
}

function applyBuild(state: GameState, cmd: Command): void {
  if (!cmd.buildingKind || cmd.x === undefined || cmd.y === undefined) return;
  const workers = ownedUnits(state, cmd).filter((u) => u.role === 'worker');
  if (workers.length === 0) return;
  placeBuilding(state, workers[0], cmd.buildingKind, Math.floor(cmd.x), Math.floor(cmd.y));
}
