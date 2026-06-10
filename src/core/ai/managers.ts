// AI 매니저: 경제(일꾼/농장) / 건설(빌드오더+배치) / 생산(병력 조합) — OpenRA 모듈 분업 청사진

import type { GameState } from '../state';
import { buildingCenter } from '../state';
import type { Building, BuildingKind, Command, PlayerId, Unit, UnitRole } from '../types';
import type { BuildOrder } from './types';
import { BUILDING_STATS, ECON, UNIT_STATS, UPGRADES } from '../../data/baseline';
import { canPlace, playerTier } from '../building';
import { T_FOREST, tileIndex } from '../map';
import { SUPPLY_CAP } from '../const';

export interface AiMemory {
  doneSteps: Set<number>;
  workersTarget: number;
  defensive: boolean; // 러시 감지 대응 프리셋
  towersBuilt: number;
  pendingBuild: Map<BuildingKind, number>; // 중복 건설 방지 (만료 틱)
}

export function myUnits(state: GameState, me: PlayerId): Unit[] {
  return state.units.filter((u) => u.player === me && u.state !== 'dead' && u.charmOwner < 0);
}

export function myBuildings(state: GameState, me: PlayerId, kind?: BuildingKind): Building[] {
  return state.buildings.filter((b) => b.player === me && b.hp > 0 && (!kind || b.kind === kind));
}

/** 경제: 유휴 일꾼 배치 + 목재 비율 + 일꾼 훈련 + 농장 */
export function economyTickAi(state: GameState, me: PlayerId, mem: AiMemory, cmds: Command[]): void {
  const p = state.players[me];
  const workers = myUnits(state, me).filter((u) => u.role === 'worker');
  const hq = myBuildings(state, me, 'hq').find((b) => b.buildProgress >= 1);
  if (!hq) return;
  const hqC = buildingCenter(hq);

  // 목재 일꾼 비율: 목재 부족할수록 상향
  const woodWorkersWant = p.wood < 200 ? Math.ceil(workers.length * 0.4) : p.wood < 600 ? Math.ceil(workers.length * 0.25) : 1;
  let onWood = workers.filter((u) => u.state === 'harvesting' && u.harvestTargetId === 0).length;

  for (const u of workers) {
    if (u.state !== 'idle') continue;
    if (onWood < woodWorkersWant) {
      const f = nearestForest(state, hqC.x, hqC.y);
      if (f) {
        cmds.push({ type: 'harvest', player: me, unitIds: [u.id], x: f.x + 0.5, y: f.y + 0.5 });
        onWood++;
        continue;
      }
    }
    // 최근접 금광 (배열 첫 금광 = 맵 좌상단 = P0측 → 심각한 포지션 편향이었음)
    let mine = null;
    let bestD = Infinity;
    for (const m of state.mines) {
      if (m.collapsed) continue;
      const d = (m.tileX + 1 - hqC.x) ** 2 + (m.tileY + 1 - hqC.y) ** 2;
      if (d < bestD) {
        bestD = d;
        mine = m;
      }
    }
    if (mine) cmds.push({ type: 'harvest', player: me, unitIds: [u.id], targetId: mine.id });
  }
  // 일꾼 훈련
  if (workers.length < mem.workersTarget && hq.queue.length === 0 && p.gold >= UNIT_STATS.worker.cost.gold) {
    cmds.push({ type: 'train', player: me, buildingId: hq.id, unitRole: 'worker' });
  }
  // 보급 여유 < 4 → 농장 (중복 방지)
  const cap = Math.min(p.supplyCap, SUPPLY_CAP);
  const farmPending = (mem.pendingBuild.get('farm') ?? 0) > state.tick ||
    myBuildings(state, me, 'farm').some((b) => b.buildProgress < 1);
  if (cap - p.supply < 4 && cap < SUPPLY_CAP && !farmPending && canAfford(p.gold, p.wood, 'farm')) {
    requestBuild(state, me, mem, 'farm', cmds);
  }
}

/** 빌드오더 실행 + 방어 프리셋 (타워)
 * build 단계는 doneSteps 대신 "해당 건물 실보유 수"로 완료 판정 — 배치 실패 시 자동 재시도 */
export function buildTickAi(state: GameState, me: PlayerId, mem: AiMemory, bo: BuildOrder, cmds: Command[]): void {
  const p = state.players[me];
  const kindCounts: Partial<Record<BuildingKind, number>> = {};
  for (const b of myBuildings(state, me)) kindCounts[b.kind] = (kindCounts[b.kind] ?? 0) + 1;
  const kindOrdinal: Partial<Record<BuildingKind, number>> = {};
  for (let i = 0; i < bo.steps.length; i++) {
    const s = bo.steps[i];
    const a = s.action;
    if (a.kind === 'build') {
      const ordinal = (kindOrdinal[a.building] = (kindOrdinal[a.building] ?? 0) + 1);
      if ((kindCounts[a.building] ?? 0) >= ordinal) continue; // 이미 보유 = 완료
      if (p.supply < s.atSupply) continue;
      if (!canAfford(p.gold, p.wood, a.building)) continue;
      requestBuild(state, me, mem, a.building, cmds); // 성공 여부와 무관하게 다음 결정에서 재평가
      continue;
    }
    if (mem.doneSteps.has(i)) continue;
    if (p.supply < s.atSupply) continue;
    if (a.kind === 'workersTarget') {
      mem.workersTarget = a.n;
      mem.doneSteps.add(i);
    } else if (a.kind === 'tierUp') {
      const hq = myBuildings(state, me, 'hq').find((b) => b.buildProgress >= 1 && b.queue.length === 0);
      if (hq && tryTierUp(p.gold, p.wood, hq.tier)) {
        cmds.push({ type: 'tierUp', player: me, buildingId: hq.id });
        mem.doneSteps.add(i);
      }
    } else if (a.kind === 'upgrade') {
      const host = a.id === 'elite' ? 'magetower' : 'forge';
      const b = myBuildings(state, me, host).find((x) => x.buildProgress >= 1 && x.queue.length === 0);
      const def = UPGRADES[a.id];
      if (b && def && p.gold >= def.cost.gold && p.wood >= def.cost.wood) {
        cmds.push({ type: 'upgrade', player: me, buildingId: b.id, upgradeId: a.id });
        mem.doneSteps.add(i);
      }
    }
  }
  // 방어 프리셋: 타워 최대 2기
  if (mem.defensive && mem.towersBuilt < 2 && canAfford(p.gold, p.wood, 'tower')) {
    if (requestBuild(state, me, mem, 'tower', cmds)) mem.towersBuilt++;
  }
}

/** 지속 생산: 조합 가중치 대비 부족 역할 훈련 */
export function productionTickAi(state: GameState, me: PlayerId, bo: BuildOrder, cmds: Command[]): void {
  const p = state.players[me];
  const army = myUnits(state, me).filter((u) => u.role !== 'worker');
  const counts: Partial<Record<UnitRole, number>> = {};
  for (const u of army) counts[u.role] = (counts[u.role] ?? 0) + 1;
  const totalWeight = Object.values(bo.composition).reduce((a, b) => a + b, 0) || 1;
  const totalArmy = army.length + 1;
  // 부족도 내림차순으로 시도 — 최우선 역할이 티어/건물/자원 게이트에 걸리면 다음 역할로 폴백
  const ranked = (Object.entries(bo.composition) as [UnitRole, number][])
    .map(([role, w]) => {
      const want = (w / totalWeight) * totalArmy + 0.5;
      const have = (role === 'cavalry' ? (counts.cavalry ?? 0) + (counts.elite ?? 0) : counts[role]) ?? 0;
      return { role, deficit: want - have };
    })
    .filter((r) => r.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.role.localeCompare(b.role)); // tie-break 결정성
  for (const { role } of ranked) {
    const stats = UNIT_STATS[role];
    if (p.gold < stats.cost.gold || p.wood < stats.cost.wood) continue;
    if (stats.requiresTier > playerTier(state, me)) continue;
    const host = myBuildings(state, me).find(
      (b) => b.buildProgress >= 1 && BUILDING_STATS[b.kind].trains.includes(role) && b.queue.length < 2,
    );
    if (!host) continue;
    cmds.push({ type: 'train', player: me, buildingId: host.id, unitRole: role });
    return;
  }
}

// ── 헬퍼 ──────────────────────────────

function canAfford(gold: number, wood: number, kind: BuildingKind): boolean {
  const c = BUILDING_STATS[kind].cost;
  return gold >= c.gold && wood >= c.wood;
}

function tryTierUp(gold: number, wood: number, tier: number): boolean {
  if (tier >= 3) return false;
  const def = tier === 1 ? { gold: 600, wood: 300 } : { gold: 900, wood: 500 };
  return gold >= def.gold && wood >= def.wood;
}

/** HQ 주변 나선 탐색 배치 + 일꾼 1기 지정. 성공 시 true */
function requestBuild(state: GameState, me: PlayerId, mem: AiMemory, kind: BuildingKind, cmds: Command[]): boolean {
  if ((mem.pendingBuild.get(kind) ?? 0) > state.tick) return false;
  const hq = myBuildings(state, me, 'hq')[0];
  if (!hq) return false;
  const c = buildingCenter(hq);
  const spot = findSpot(state, me, kind, Math.floor(c.x), Math.floor(c.y));
  if (!spot) return false;
  const worker = nearestWorker(state, me, spot.x, spot.y);
  if (!worker) return false;
  cmds.push({ type: 'build', player: me, unitIds: [worker.id], buildingKind: kind, x: spot.x, y: spot.y });
  mem.pendingBuild.set(kind, state.tick + 200); // 중복 방지 쿨다운
  return true;
}

function findSpot(state: GameState, me: PlayerId, kind: BuildingKind, cx: number, cy: number): { x: number; y: number } | null {
  for (let r = 4; r <= 14; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // 링만
        const x = cx + dx;
        const y = cy + dy;
        if (canPlace(state, me, kind, x, y) === null) return { x, y };
      }
    }
  }
  return null;
}

function nearestWorker(state: GameState, me: PlayerId, x: number, y: number): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const u of myUnits(state, me)) {
    if (u.role !== 'worker' || u.state === 'building') continue;
    const d = (u.x - x) ** 2 + (u.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

function nearestForest(state: GameState, x: number, y: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  const map = state.map;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.terrain[tileIndex(map, tx, ty)] !== T_FOREST) continue;
      const d = (tx - x) ** 2 + (ty - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: tx, y: ty };
      }
    }
  }
  return best;
}

export const ECON_REF = ECON; // (참조 유지)
