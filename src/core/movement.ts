// 유닛 이동 — Flow Field + 분리 스티어링 + 도착감쇠/데드존 + stuck 폴백 (플랜 §3)
// 이 모듈은 위치만 갱신. 상태 전이는 각 시스템(economy/combat 등)이 소유.
// 예외: 단순 'moving'은 도착 시 idle 전환.

import type { GameState } from './state';
import type { Unit, UnitState } from './types';
import type { PassClass } from './map';
import { inBounds, passable } from './map';
import { sampleFlow } from './pathfind/flowfield';
import { UNIT_STATS } from '../data/baseline';
import { normalize } from './vec';

const ARRIVE_RADIUS = 0.22;
const SEP_RADIUS = 0.7;
const STUCK_LIMIT = 30;

const LOCOMOTING: ReadonlySet<UnitState> = new Set([
  'moving', 'attackMove', 'harvesting', 'returning', 'building', 'attacking',
]);

export function passClassOf(u: Unit): PassClass {
  return u.faction === 'yokai' ? 'forest' : 'ground';
}

/** 채집/운반 중 유닛은 분리 스티어링 완전 제외 — 경제 마비 방지 (플랜 §3 핵심) */
function ignoresSeparation(u: Unit): boolean {
  return u.state === 'harvesting' || u.state === 'returning' || u.state === 'building';
}

export function unitSpeed(u: Unit): number {
  let speed = UNIT_STATS[u.role].speed;
  for (const b of u.buffs) if (b.kind === 'haste') speed *= 1 + b.power;
  if (u.faction === 'murim') speed *= 1.08; // 무림 패시브 (§2.2)
  return speed;
}

export function moveUnits(state: GameState): void {
  const neighbors: Unit[] = [];
  // 틱 홀짝 교차 순회 — 이동 우선권의 진영 편향 상쇄 (combat.fairOrder와 동일 원리)
  const order = state.tick % 2 === 0 ? state.units : [...state.units].reverse();
  for (const u of order) {
    if (u.state === 'dead' || !LOCOMOTING.has(u.state)) continue;
    if (u.buffs.some((b) => b.kind === 'stun')) continue; // 점혈 — 행동 불가
    const dx = u.destX - u.x;
    const dy = u.destY - u.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= ARRIVE_RADIUS * ARRIVE_RADIUS) {
      if (u.state === 'moving') u.state = 'idle';
      continue;
    }
    stepUnit(state, u, Math.sqrt(distSq), neighbors);
  }
}

function stepUnit(state: GameState, u: Unit, dist: number, neighbors: Unit[]): void {
  const cls = passClassOf(u);
  const destTx = Math.floor(u.destX);
  const destTy = Math.floor(u.destY);
  let dirX: number;
  let dirY: number;

  if (Math.floor(u.x) === destTx && Math.floor(u.y) === destTy) {
    // 목적지 타일 내부 — 직접 벡터
    const d = normalize(u.destX - u.x, u.destY - u.y);
    dirX = d.x;
    dirY = d.y;
  } else {
    const field = state.flowCache.get(state.map, destTx, destTy, cls);
    const flow = sampleFlow(state.map, field, u.x, u.y);
    if (!flow.reachable) {
      if (u.state === 'moving') u.state = 'idle';
      return;
    }
    dirX = flow.x;
    dirY = flow.y;
  }

  if (!ignoresSeparation(u)) {
    const sep = separation(state, u, neighbors);
    dirX += sep.x * 0.8;
    dirY += sep.y * 0.8;
  }
  const dir = normalize(dirX, dirY);

  let speed = unitSpeed(u);
  if (dist < 1.0) speed *= Math.max(0.35, dist); // 도착 감쇠 (떨림 방지)

  tryStep(state, u, dir.x * speed, dir.y * speed, cls);
  trackStuck(state, u, speed, cls);
  u.lastX = u.x;
  u.lastY = u.y;
}

function separation(state: GameState, u: Unit, out: Unit[]): { x: number; y: number } {
  let px = 0;
  let py = 0;
  state.grid.query(u.x, u.y, SEP_RADIUS, out);
  for (const n of out) {
    if (n.id === u.id || n.state === 'dead' || ignoresSeparation(n)) continue;
    const dx = u.x - n.x;
    const dy = u.y - n.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= SEP_RADIUS) continue;
    if (d < 0.001) {
      // 완전 중첩 — id 기반 결정적 분리 방향
      px += u.id > n.id ? 0.5 : -0.5;
      continue;
    }
    const w = (SEP_RADIUS - d) / SEP_RADIUS;
    px += (dx / d) * w;
    py += (dy / d) * w;
  }
  return { x: px, y: py };
}

function tryStep(state: GameState, u: Unit, mx: number, my: number, cls: PassClass): void {
  const candX = u.x + mx;
  const candY = u.y + my;
  if (stepOk(state, candX, candY, cls)) {
    u.x = candX;
    u.y = candY;
  } else if (stepOk(state, candX, u.y, cls)) {
    u.x = candX; // 벽 슬라이딩 X
  } else if (stepOk(state, u.x, candY, cls)) {
    u.y = candY; // 벽 슬라이딩 Y
  }
}

function stepOk(state: GameState, x: number, y: number, cls: PassClass): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!inBounds(state.map, tx, ty)) return false;
  return passable(state.map, tx, ty, cls);
}

function trackStuck(state: GameState, u: Unit, speed: number, cls: PassClass): void {
  const moved = Math.sqrt((u.x - u.lastX) ** 2 + (u.y - u.lastY) ** 2);
  if (moved < speed * 0.15) {
    u.stuckTicks++;
    if (u.stuckTicks >= STUCK_LIMIT) {
      // push-aside 폴백: id 홀짝 기반 결정적 수직 회피
      const side = u.id % 2 === 0 ? 1 : -1;
      tryStep(state, u, 0.3 * side, 0.3 * -side, cls);
      u.stuckTicks = 15; // 곧 재평가
    }
  } else {
    u.stuckTicks = 0;
  }
}
