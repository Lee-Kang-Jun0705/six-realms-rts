// 분대 FSM — gather/attack/defend/harass/retreat (플랜 §2.4)

import type { GameState } from '../state';
import { buildingCenter } from '../state';
import type { Command, PlayerId, Unit } from '../types';
import type { Intel, Personality, SquadState } from './types';
import { unitValue } from './intel';
import { myBuildings, myUnits } from './managers';

export interface SquadMemory {
  state: SquadState;
  attackStartValue: number;
  harassCooldownUntil: number;
  harassIds: number[];
  scoutId: number;
  lastScoutTick: number;
}

export function createSquadMemory(): SquadMemory {
  return { state: 'gather', attackStartValue: 0, harassCooldownUntil: 0, harassIds: [], scoutId: 0, lastScoutTick: 0 };
}

export function armyOf(state: GameState, me: PlayerId): Unit[] {
  return myUnits(state, me).filter((u) => u.role !== 'worker');
}

export function armyValue(units: Unit[]): number {
  let v = 0;
  for (const u of units) v += unitValue(u.role);
  return v;
}

export function squadTickAi(
  state: GameState, me: PlayerId, sq: SquadMemory, intel: Intel, pers: Personality,
  attackThreshold: number, cmds: Command[],
): void {
  const army = armyOf(state, me).filter((u) => !sq.harassIds.includes(u.id));
  const value = armyValue(army);
  const hq = myBuildings(state, me, 'hq')[0];
  if (!hq) return;
  const home = buildingCenter(hq);
  const enemyBase = intel.enemyBasePos ?? { x: state.map.width / 2, y: state.map.height / 2 };

  // 방어 최우선: 본진 위협 감지
  if (intel.threatNearBase > 80) {
    sq.state = 'defend';
  } else if (sq.state === 'defend') {
    sq.state = 'gather';
  }

  switch (sq.state) {
    case 'defend': {
      const ids = army.map((u) => u.id);
      if (ids.length > 0) cmds.push({ type: 'attackMove', player: me, unitIds: ids, x: home.x, y: home.y + 2 });
      break;
    }
    case 'gather': {
      // 교착 해소: 시간이 지날수록 공격 임계 하향 (양측 거북이 → 30분 무승부 방지)
      const timeFactor = Math.max(0.35, 1 - state.tick / 28000);
      const threshold = attackThreshold * (1.2 - pers.aggression * 0.5) * timeFactor;
      if (value >= threshold) {
        sq.state = 'attack';
        sq.attackStartValue = value;
        const ids = army.map((u) => u.id);
        cmds.push({ type: 'attackMove', player: me, unitIds: ids, x: enemyBase.x, y: enemyBase.y });
      } else {
        // 집결지: 본진 전방 (idle 병력만 — 매 틱 재명령 방지)
        const idle = army.filter((u) => u.state === 'idle');
        if (idle.length > 0) {
          const rally = rallyPoint(state, home, enemyBase);
          cmds.push({ type: 'attackMove', player: me, unitIds: idle.map((u) => u.id), x: rally.x, y: rally.y });
        }
      }
      break;
    }
    case 'attack': {
      if (value < sq.attackStartValue * 0.4) {
        sq.state = 'retreat';
        const ids = army.map((u) => u.id);
        if (ids.length > 0) cmds.push({ type: 'move', player: me, unitIds: ids, x: home.x, y: home.y + 3 });
        break;
      }
      // 새로 생산된 idle 병력 합류
      const idle = army.filter((u) => u.state === 'idle');
      if (idle.length >= 3) {
        cmds.push({ type: 'attackMove', player: me, unitIds: idle.map((u) => u.id), x: enemyBase.x, y: enemyBase.y });
      }
      break;
    }
    case 'retreat':
      if (value >= sq.attackStartValue * 0.7 || intel.threatNearBase > 80) sq.state = 'gather';
      else sq.state = 'gather'; // 단순화: 즉시 재집결 모드
      break;
    case 'harass':
      sq.state = 'gather';
      break;
  }

  harassTick(state, me, sq, pers, enemyBase, cmds);
}

/** 견제: 기동 유닛 소수를 적 본진 측면으로 (수싸움 재현 — 플랜 §2.4) */
function harassTick(
  state: GameState, me: PlayerId, sq: SquadMemory, pers: Personality,
  enemyBase: { x: number; y: number }, cmds: Command[],
): void {
  sq.harassIds = sq.harassIds.filter((id) => state.units.some((u) => u.id === id && u.state !== 'dead'));
  if (pers.harass <= 0.1 || state.tick < sq.harassCooldownUntil || sq.harassIds.length > 0) return;
  const fast = armyOf(state, me)
    .filter((u) => u.role === 'cavalry' || u.role === 'elite' || u.role === 'melee')
    .slice(0, 3);
  if (fast.length < 3) return;
  sq.harassIds = fast.map((u) => u.id);
  sq.harassCooldownUntil = state.tick + Math.floor(2400 / (0.5 + pers.harass));
  // 측면 우회 지점 (id 결정적 좌/우)
  const side = fast[0].id % 2 === 0 ? 1 : -1;
  cmds.push({
    type: 'attackMove', player: me, unitIds: sq.harassIds,
    x: enemyBase.x + side * 6, y: enemyBase.y - side * 4,
  });
}

/** 정찰: 투시 보유 시 투시 우선, 아니면 일꾼 1기 왕복 */
export function scoutTickAi(
  state: GameState, me: PlayerId, sq: SquadMemory, intel: Intel, interval: number, cmds: Command[],
): void {
  if (state.tick - sq.lastScoutTick < interval) return;
  if (!intel.enemyBasePos) return;
  // 초능력자: 투시로 무손실 정찰
  const seer = myUnits(state, me).find(
    (u) => u.role === 'caster' && u.faction === 'psion' && (u.spellCooldowns['clairvoyance'] ?? 0) === 0,
  );
  if (seer) {
    sq.lastScoutTick = state.tick;
    cmds.push({
      type: 'cast', player: me, unitIds: [seer.id], spellId: 'clairvoyance',
      x: intel.enemyBasePos.x, y: intel.enemyBasePos.y,
    });
    return;
  }
  // 요괴: 둔갑 정찰 (타겟팅 면제 상태로 적진 잠입)
  const fox = myUnits(state, me).find(
    (u) => u.role === 'caster' && u.faction === 'yokai' && (u.spellCooldowns['disguise'] ?? 0) === 0,
  );
  if (fox) {
    sq.lastScoutTick = state.tick;
    sq.scoutId = fox.id;
    cmds.push({ type: 'cast', player: me, unitIds: [fox.id], spellId: 'disguise' });
    cmds.push({ type: 'move', player: me, unitIds: [fox.id], x: intel.enemyBasePos.x + 2, y: intel.enemyBasePos.y + 2 });
    return;
  }
  const alive = state.units.find((u) => u.id === sq.scoutId && u.state !== 'dead');
  if (alive) return; // 정찰 진행 중
  const worker = myUnits(state, me).find((u) => u.role === 'worker' && u.state !== 'building');
  if (!worker) return;
  sq.scoutId = worker.id;
  sq.lastScoutTick = state.tick;
  cmds.push({ type: 'move', player: me, unitIds: [worker.id], x: intel.enemyBasePos.x + 3, y: intel.enemyBasePos.y + 3 });
}

function rallyPoint(state: GameState, home: { x: number; y: number }, enemy: { x: number; y: number }): { x: number; y: number } {
  const dx = enemy.x - home.x;
  const dy = enemy.y - home.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: Math.min(state.map.width - 2, Math.max(2, home.x + (dx / len) * 6)),
    y: Math.min(state.map.height - 2, Math.max(2, home.y + (dy / len) * 6)),
  };
}
