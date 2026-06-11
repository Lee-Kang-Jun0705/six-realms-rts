// 게임 상태 컨테이너 + 엔티티 생성/조회 (결정성: 배열 push 순서 = id 오름차순)

import type {
  Building, BuildingKind, Command, FactionId, GoldMine, PlayerId, PlayerState, TeamId, Unit, UnitRole, UsageCounters,
} from './types';
import type { WorldMap } from './map';
import { placeMine } from './map';
import { Fog } from './fog';
import { RngStreams } from './rng';
import { FlowCache } from './pathfind/flowfield';
import { SpatialGrid } from './grid';
import { BUILDING_STATS, ECON, UNIT_STATS } from '../data/baseline';

export interface GameState {
  tick: number;
  seed: number;
  streams: RngStreams;
  map: WorldMap;
  units: Unit[];
  buildings: Building[];
  mines: GoldMine[];
  players: PlayerState[];
  fog: Fog[];
  /** 플레이어 → 팀 매핑 (1v1=[0,1] 각자팀, 3v3=[0,0,0,1,1,1]). 승패·적 판정 기준 */
  teams: TeamId[];
  nextId: number;
  /** -1 진행중 / 승리 팀의 대표 플레이어 id / -2 무승부 */
  winner: PlayerId | -1 | -2;
  counters: UsageCounters;
  commandLog: { tick: number; cmds: Command[] }[];
  flowCache: FlowCache;
  grid: SpatialGrid;
  /** 투시 등 임시 시야 (untilTick 지나면 제거) */
  revealers: { player: PlayerId; x: number; y: number; radius: number; untilTick: number }[];
  /** 부활 스펠용 사망 기록 (비정예/비소환만, 최대 12) */
  recentDeaths: { player: PlayerId; role: UnitRole; tick: number }[];
  /** 디펜스 모드 상태 (없으면 일반 대전) */
  defense?: import('./defense').DefenseState;
  /** 시각 전용 fx 이벤트 (발사체 등) — 렌더가 소비. 결정성 해시 제외, 헤드리스는 미축적 */
  fx: FxEvent[];
  /** fx 축적 여부 (렌더 모드 true, 헤드리스 false) */
  emitFx: boolean;
}

export interface FxEvent {
  kind: 'arrow' | 'bolt' | 'cannon' | 'magic' | 'heal' | 'smite';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function createPlayer(faction: FactionId): PlayerState {
  return {
    faction,
    gold: ECON.startGold,
    wood: ECON.startWood,
    supply: 0,
    supplyCap: 0,
    upgrades: {},
    defeated: false,
    summonCount: 0,
  };
}

export function createState(
  map: WorldMap, seed: number, factions: FactionId[], teams?: TeamId[],
): GameState {
  const state: GameState = {
    tick: 0,
    seed,
    streams: new RngStreams(seed),
    map,
    units: [],
    buildings: [],
    mines: [],
    players: factions.map(createPlayer),
    fog: factions.map(() => new Fog(map)),
    // 팀 미지정 = 각자 팀 (1v1/FFA). 3v3은 [0,0,0,1,1,1] 전달
    teams: teams ?? factions.map((_, i) => i),
    nextId: 1,
    winner: -1,
    counters: { unitsProduced: {}, spellsCast: {}, engagements: 0, buildingsBuilt: {}, castersByFaction: {} },
    commandLog: [],
    flowCache: new FlowCache(),
    grid: new SpatialGrid(map.width),
    revealers: [],
    recentDeaths: [],
    fx: [],
    emitFx: false,
  };
  for (const spot of map.mineSpots) {
    const mine: GoldMine = {
      id: state.nextId++, tileX: spot.tileX, tileY: spot.tileY, w: 2, h: 2,
      remaining: ECON.mineGold, collapsed: false,
    };
    state.mines.push(mine);
    placeMine(map, mine);
  }
  return state;
}

export function spawnUnit(state: GameState, player: PlayerId, role: UnitRole, x: number, y: number, isSummoned = false): Unit {
  const s = UNIT_STATS[role];
  const faction = state.players[player].faction;
  const unit: Unit = {
    id: state.nextId++, player, faction, role,
    x, y, hp: s.hp, maxHp: s.hp, shield: 0,
    state: 'idle', destX: x, destY: y, orderX: x, orderY: y, targetId: 0,
    attackCooldown: 0, windup: 0,
    cargo: null, cargoAmount: 0, harvestTicks: 0, harvestTargetId: 0,
    forestX: -1, forestY: -1, buildTargetId: 0,
    stuckTicks: 0, lastX: x, lastY: y,
    isSummoned, buffs: [], spellCooldowns: {},
    charmOwner: -1, charmTicks: 0, usedRevive: false, outOfCombatTicks: 0,
  };
  state.units.push(unit);
  if (!isSummoned) state.players[player].supply += s.supply;
  else state.players[player].summonCount++;
  state.counters.unitsProduced[role] = (state.counters.unitsProduced[role] ?? 0) + 1;
  if (role === 'caster') {
    state.counters.castersByFaction[faction] = (state.counters.castersByFaction[faction] ?? 0) + 1;
  }
  return unit;
}

export function addBuilding(
  state: GameState, player: PlayerId, kind: BuildingKind, tileX: number, tileY: number, complete: boolean,
): Building {
  const s = BUILDING_STATS[kind];
  const faction = state.players[player].faction;
  const maxHp = faction === 'fantasy' ? Math.floor(s.hp * 1.2) : s.hp; // 판타지 패시브 (§2.2)
  const b: Building = {
    id: state.nextId++, player, faction, kind, tier: 1,
    tileX, tileY, w: s.w, h: s.h,
    hp: complete ? maxHp : Math.max(1, Math.floor(maxHp * 0.1)),
    maxHp,
    buildProgress: complete ? 1 : 0,
    queue: [], rallyX: tileX + s.w / 2, rallyY: tileY + s.h + 0.5, attackCooldown: 0,
  };
  state.buildings.push(b);
  if (complete) state.players[player].supplyCap += s.supplyProvided;
  return b;
}

export function findUnit(state: GameState, id: number): Unit | undefined {
  return state.units.find((u) => u.id === id && u.state !== 'dead');
}

export function findBuilding(state: GameState, id: number): Building | undefined {
  return state.buildings.find((b) => b.id === id && b.hp > 0);
}

export function findMine(state: GameState, id: number): GoldMine | undefined {
  return state.mines.find((m) => m.id === id && !m.collapsed);
}

export function buildingCenter(b: Building): { x: number; y: number } {
  return { x: b.tileX + b.w / 2, y: b.tileY + b.h / 2 };
}

export function mineCenter(m: GoldMine): { x: number; y: number } {
  return { x: m.tileX + m.w / 2, y: m.tileY + m.h / 2 };
}

/** 시각 fx 발행 (렌더 모드에서만 축적, 헤드리스는 무시 — 코어 결정성 무관) */
export function emitFxEvent(state: GameState, fx: FxEvent): void {
  if (!state.emitFx) return;
  state.fx.push(fx);
  if (state.fx.length > 300) state.fx.shift();
}
