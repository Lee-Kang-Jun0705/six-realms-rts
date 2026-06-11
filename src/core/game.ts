// 게임 루프 오케스트레이터 — createGame / step (브라우저·헤드리스 공용 진입점)

import type { FactionId, Command, GoldMine, TeamId } from './types';
import type { GameState } from './state';
import { addBuilding, createState, mineCenter, spawnUnit } from './state';
import { occupyRect, parseMap } from './map';
import { applyCommand } from './commands';
import { economyTick } from './economy';
import { constructionTick } from './building';
import { productionTick } from './production';
import { combatTick, statusTick } from './combat';
import { autoCastTick } from './autoCast';
import { registerFactionSpells } from './factionSpells';
import { moveUnits } from './movement';
import { victoryTick } from './victory';
import { defenseTick, defenseVictoryTick, setupDefense } from './defense';
import { BUILDING_STATS, ECON, UNIT_STATS } from '../data/baseline';
import { StateHasher } from './hash';
import { distSq } from './vec';

export interface GameConfig {
  mapAscii: string;
  seed: number;
  /** 2인(1v1) 또는 6인(3v3) 등 가변. 길이 = 플레이어 수 */
  factions: FactionId[];
  /** 플레이어 → 팀 매핑. 미지정 = 각자 팀 (1v1/FFA). 3v3 = [0,0,0,1,1,1] */
  teams?: TeamId[];
  /** 디펜스 모드: P1 기지 제거 + 웨이브 디렉터 활성화 */
  defense?: boolean;
}

export function createGame(cfg: GameConfig): GameState {
  registerFactionSpells(); // 멱등 — 레지스트리 갱신
  const map = parseMap(cfg.mapAscii);
  const state = createState(map, cfg.seed, cfg.factions, cfg.teams);
  for (let player = 0; player < state.players.length; player++) {
    const start = map.starts[player];
    const hq = addBuilding(state, player, 'hq', start.x - 1, start.y - 1, true);
    occupyRect(state.map, hq.id, hq.tileX, hq.tileY, hq.w, hq.h);
    const mine = nearestMine(state, start.x, start.y);
    for (let i = 0; i < ECON.startWorkers; i++) {
      const u = spawnUnit(state, player, 'worker', start.x + 2 + i * 0.6, start.y + 2.5);
      if (mine) {
        u.harvestTargetId = mine.id;
        u.state = 'harvesting';
      }
    }
  }
  if (cfg.defense) setupDefense(state);
  return state;
}

function nearestMine(state: GameState, x: number, y: number): GoldMine | undefined {
  let best: GoldMine | undefined;
  let bestD = Infinity;
  for (const m of state.mines) {
    if (m.collapsed) continue;
    const c = mineCenter(m);
    const d = distSq(x, y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

const FOG_INTERVAL = 4; // 플랜 M-6: 시야 갱신 4틱 주기

export function step(state: GameState, commands: Command[]): void {
  if (state.winner !== -1) return;
  state.grid.rebuild(state.units); // 명령(스펠 등)이 grid를 쓰므로 명령 적용 전에 재구축
  if (commands.length > 0) {
    state.commandLog.push({ tick: state.tick, cmds: commands });
    for (const cmd of commands) applyCommand(state, cmd);
  }
  if (state.tick % FOG_INTERVAL === 0) updateFog(state);
  economyTick(state);
  constructionTick(state);
  productionTick(state);
  combatTick(state);
  autoCastTick(state);
  statusTick(state);
  moveUnits(state);
  sweepDead(state);
  if (state.defense) {
    defenseTick(state);
    defenseVictoryTick(state);
  } else {
    victoryTick(state);
  }
  state.tick++;
}

function updateFog(state: GameState): void {
  state.revealers = state.revealers.filter((r) => r.untilTick > state.tick);
  for (let player = 0; player < state.players.length; player++) {
    const fog = state.fog[player];
    fog.beginUpdate();
    for (const u of state.units) {
      if (u.state === 'dead' || u.player !== player) continue;
      fog.stampCircle(u.x, u.y, UNIT_STATS[u.role].vision);
    }
    for (const b of state.buildings) {
      if (b.player !== player || b.hp <= 0) continue;
      fog.stampCircle(b.tileX + b.w / 2, b.tileY + b.h / 2, BUILDING_STATS[b.kind].vision);
    }
    for (const r of state.revealers) {
      if (r.player === player) fog.stampCircle(r.x, r.y, r.radius);
    }
  }
}

function sweepDead(state: GameState): void {
  let hasDead = false;
  for (const u of state.units) {
    if (u.state === 'dead') {
      hasDead = true;
      break;
    }
  }
  if (hasDead) state.units = state.units.filter((u) => u.state !== 'dead');
}

/** 결정성 카나리아용 상태 해시 (플랜 §5-1) */
export function hashState(state: GameState): number {
  const h = new StateHasher();
  h.num(state.tick);
  for (const p of state.players) h.num(p.gold).num(p.wood).num(p.supply).num(p.supplyCap);
  for (const u of state.units) h.num(u.id).num(u.x).num(u.y).num(u.hp).str(u.state);
  for (const b of state.buildings) h.num(b.id).num(b.hp).num(b.buildProgress).num(b.queue.length);
  for (const m of state.mines) h.num(m.remaining);
  return h.value();
}

export interface InvariantViolation {
  tick: number;
  rule: string;
  detail: string;
}

/** 매 틱 불변식 검사 (헤드리스 시뮬 전용 — 플랜 §5-2) */
export function checkInvariants(state: GameState): InvariantViolation[] {
  const v: InvariantViolation[] = [];
  const bad = (rule: string, detail: string): void => {
    v.push({ tick: state.tick, rule, detail });
  };
  for (const p of state.players) {
    if (p.gold < 0 || !Number.isFinite(p.gold)) bad('resource>=0', `gold=${p.gold}`);
    if (p.wood < 0 || !Number.isFinite(p.wood)) bad('resource>=0', `wood=${p.wood}`);
    if (p.supply < 0) bad('supply>=0', `supply=${p.supply}`);
  }
  for (const u of state.units) {
    if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) bad('finiteCoord', `unit ${u.id} ${u.x},${u.y}`);
    if (u.hp > u.maxHp) bad('hp<=max', `unit ${u.id} hp=${u.hp}/${u.maxHp}`);
    if (!Number.isFinite(u.hp)) bad('finiteHp', `unit ${u.id}`);
    if (u.x < 0 || u.y < 0 || u.x > state.map.width || u.y > state.map.height) {
      bad('inMap', `unit ${u.id} ${u.x.toFixed(2)},${u.y.toFixed(2)}`);
    }
  }
  return v;
}
