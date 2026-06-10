// 게임 상태 컨테이너 + 엔티티 생성/조회 (결정성: 배열 push 순서 = id 오름차순)

import type {
  Building, BuildingKind, Command, FactionId, GoldMine, PlayerId, PlayerState, Unit, UnitRole, UsageCounters,
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
  players: [PlayerState, PlayerState];
  fog: [Fog, Fog];
  nextId: number;
  /** -1 진행중 / 0,1 승자 / -2 무승부 */
  winner: PlayerId | -1 | -2;
  counters: UsageCounters;
  commandLog: { tick: number; cmds: Command[] }[];
  flowCache: FlowCache;
  grid: SpatialGrid;
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

export function createState(map: WorldMap, seed: number, factions: [FactionId, FactionId]): GameState {
  const state: GameState = {
    tick: 0,
    seed,
    streams: new RngStreams(seed),
    map,
    units: [],
    buildings: [],
    mines: [],
    players: [createPlayer(factions[0]), createPlayer(factions[1])],
    fog: [new Fog(map), new Fog(map)],
    nextId: 1,
    winner: -1,
    counters: { unitsProduced: {}, spellsCast: {}, engagements: 0, buildingsBuilt: {} },
    commandLog: [],
    flowCache: new FlowCache(),
    grid: new SpatialGrid(map.width),
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
  return unit;
}

export function addBuilding(
  state: GameState, player: PlayerId, kind: BuildingKind, tileX: number, tileY: number, complete: boolean,
): Building {
  const s = BUILDING_STATS[kind];
  const b: Building = {
    id: state.nextId++, player, faction: state.players[player].faction, kind, tier: 1,
    tileX, tileY, w: s.w, h: s.h,
    hp: complete ? s.hp : Math.max(1, Math.floor(s.hp * 0.1)),
    maxHp: s.hp,
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
