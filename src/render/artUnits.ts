// 유닛 절차 드로잉 — 카툰 치비 (48x48 캔버스, 우향 기준, 좌향은 flipX)
// 베이스 골격 = 역할 6종 공용 리그 + 역할별 무기/탈것 + 종족 머리장식 오버레이
// 규칙: 플랫 셰이딩, 굵은 외곽선, 그라디언트 금지 (플랜 §2.6)

import Phaser from 'phaser';
import type { FactionId, UnitRole } from '../core/types';
import { COL, FACTION_PALETTES, type FactionPalette } from './palette';

export type Motion = 'idle' | 'walk' | 'attack' | 'death';
export const MOTION_FRAMES: Record<Motion, number> = { idle: 2, walk: 4, attack: 4, death: 4 };
export const UNIT_CANVAS = 48;

type G = Phaser.GameObjects.Graphics;

interface Pose {
  bob: number; // 몸통 상하
  legSwing: number; // 다리 전후 (px)
  weaponSwing: number; // 무기 각도 (rad)
  fall: number; // 사망 진행 0~1
  lunge: number; // 공격 전진 px
}

function poseOf(motion: Motion, frame: number): Pose {
  if (motion === 'walk') {
    const sw = [3, 0, -3, 0][frame % 4];
    return { bob: frame % 2 === 0 ? -1 : 0, legSwing: sw, weaponSwing: 0, fall: 0, lunge: 0 };
  }
  if (motion === 'attack') {
    const ang = [-0.7, 0.9, 0.4, 0][frame % 4];
    const lg = [0, 3, 2, 0][frame % 4];
    return { bob: 0, legSwing: 0, weaponSwing: ang, fall: 0, lunge: lg };
  }
  if (motion === 'death') {
    return { bob: 0, legSwing: 0, weaponSwing: 0, fall: (frame + 1) / 4, lunge: 0 };
  }
  return { bob: frame % 2 === 0 ? 0 : -1, legSwing: 0, weaponSwing: 0, fall: 0, lunge: 0 };
}

export function drawUnitFrame(g: G, faction: FactionId, role: UnitRole, motion: Motion, frame: number): void {
  const pal = FACTION_PALETTES[faction];
  const pose = poseOf(motion, frame);
  g.save();
  // 기준점: 발 위치 (24, 42)
  g.translateCanvas(24 + pose.lunge, 42);
  if (pose.fall > 0) {
    g.rotateCanvas((Math.PI / 2) * pose.fall);
    g.translateCanvas(0, -3 * pose.fall);
  }
  if (role === 'siege') drawSiege(g, pal, pose);
  else if (role === 'cavalry' || role === 'elite') drawMounted(g, pal, pose, faction, role);
  else drawInfantry(g, pal, pose, faction, role);
  g.restore();
}

function outline(g: G): void {
  g.lineStyle(2, COL.outline, 1);
}

/** 보병 공용 리그: 다리→몸통→머리→무기 */
function drawInfantry(g: G, pal: FactionPalette, pose: Pose, faction: FactionId, role: UnitRole): void {
  const bodyY = -14 + pose.bob;
  drawLegs(g, pose, -4);
  if (role === 'caster') {
    // 로브 (삼각 실루엣)
    outline(g);
    g.fillStyle(pal.main, 1);
    g.fillTriangle(-7, 0, 7, 0, 0, bodyY - 4);
    g.strokeTriangle(-7, 0, 7, 0, 0, bodyY - 4);
  } else {
    outline(g);
    g.fillStyle(pal.main, 1);
    g.fillRoundedRect(-6, bodyY, 12, 13, 4);
    g.strokeRoundedRect(-6, bodyY, 12, 13, 4);
    g.fillStyle(pal.sub, 1);
    g.fillRect(-6, bodyY + 9, 12, 3); // 벨트
  }
  drawHead(g, faction, pal, 0, bodyY - 7, role);
  drawWeapon(g, pal, pose, role);
}

function drawLegs(g: G, pose: Pose, y: number): void {
  outline(g);
  g.fillStyle(COL.outline, 1);
  g.fillRoundedRect(-5 + pose.legSwing, y, 4, 5, 2);
  g.fillRoundedRect(1 - pose.legSwing, y, 4, 5, 2);
}

function drawHead(g: G, faction: FactionId, pal: FactionPalette, x: number, y: number, role: UnitRole): void {
  outline(g);
  g.fillStyle(COL.skin, 1);
  g.fillCircle(x, y, 6.5);
  g.strokeCircle(x, y, 6.5);
  g.fillStyle(COL.outline, 1);
  g.fillCircle(x + 3, y - 1, 1.1); // 눈 (우향)
  drawFactionHeadgear(g, faction, pal, x, y, role);
}

/** 종족 머리장식 오버레이 토큰 — 종족당 1개 (플랜 §2.6 오버레이 전략) */
function drawFactionHeadgear(g: G, faction: FactionId, pal: FactionPalette, x: number, y: number, role: UnitRole): void {
  outline(g);
  switch (faction) {
    case 'psion': // 이마 보석 + 사이킥 링
      g.fillStyle(pal.accent, 1);
      g.fillCircle(x + 1, y - 4, 2);
      break;
    case 'murim': // 상투 + 머리띠
      g.fillStyle(COL.outline, 1);
      g.fillCircle(x - 1, y - 7, 2.4);
      g.fillStyle(pal.accent, 1);
      g.fillRect(x - 6, y - 4, 12, 2);
      break;
    case 'fantasy': // 투구 챙
      g.fillStyle(COL.steel, 1);
      g.fillRoundedRect(x - 6, y - 7, 12, 5, 2);
      g.strokeRoundedRect(x - 6, y - 7, 12, 5, 2);
      break;
    case 'yokai': // 여우귀 2개
      g.fillStyle(pal.main, 1);
      g.fillTriangle(x - 6, y - 4, x - 2, y - 6, x - 5, y - 10);
      g.fillTriangle(x + 2, y - 6, x + 6, y - 4, x + 5, y - 10);
      break;
    case 'demon': // 뿔 2개
      g.fillStyle(pal.accent, 1);
      g.fillTriangle(x - 5, y - 4, x - 2, y - 5, x - 6, y - 10);
      g.fillTriangle(x + 2, y - 5, x + 5, y - 4, x + 6, y - 10);
      break;
    case 'celestial': // 헤일로
      g.lineStyle(2, pal.accent, 1);
      g.strokeEllipse(x, y - 9, 10, 3);
      break;
    default:
      g.fillStyle(pal.main, 1);
      g.fillRect(x - 5, y - 6, 10, 2);
  }
  if (role === 'worker') {
    g.lineStyle(2, COL.wood, 1);
    g.strokeCircle(x, y, 6.5); // 일꾼: 갈색 두건 윤곽으로 구분
  }
}

function drawWeapon(g: G, pal: FactionPalette, pose: Pose, role: UnitRole): void {
  g.save();
  g.translateCanvas(7, -12 + pose.bob);
  g.rotateCanvas(pose.weaponSwing);
  outline(g);
  switch (role) {
    case 'worker': // 곡괭이
      g.fillStyle(COL.wood, 1);
      g.fillRect(-1, -9, 2.5, 11);
      g.fillStyle(COL.steel, 1);
      g.fillTriangle(-5, -9, 6, -9, 0.5, -5);
      break;
    case 'melee': // 검 + 방패
      g.fillStyle(COL.steel, 1);
      g.fillRect(-1, -12, 3, 12);
      g.fillTriangle(-1, -14, 2, -14, 0.5, -17);
      g.fillStyle(pal.sub, 1);
      g.fillCircle(-9, 3, 5);
      g.strokeCircle(-9, 3, 5);
      break;
    case 'ranged': // 활
      g.lineStyle(2.5, COL.wood, 1);
      g.beginPath();
      g.arc(0, -2, 8, -Math.PI / 2.2, Math.PI / 2.2, false);
      g.strokePath();
      g.lineStyle(1, COL.steelDark, 1);
      g.lineBetween(0, -10, 0, 6);
      break;
    case 'caster': // 지팡이 + 보주
      g.fillStyle(COL.wood, 1);
      g.fillRect(-1, -13, 2.5, 15);
      g.fillStyle(pal.accent, 1);
      g.fillCircle(0.3, -14, 3.2);
      g.strokeCircle(0.3, -14, 3.2);
      break;
    default:
      break;
  }
  g.restore();
}

/** 기동/정예: 4족 탈것 + 기수 */
function drawMounted(g: G, pal: FactionPalette, pose: Pose, faction: FactionId, role: UnitRole): void {
  outline(g);
  // 다리 4개 (걷기 스윙 교차)
  g.fillStyle(pal.main, 1);
  const s = pose.legSwing;
  for (const [lx, sw] of [[-9, s], [-4, -s], [4, s], [9, -s]] as const) {
    g.fillRoundedRect(lx + sw * 0.6 - 1.5, -6, 3.5, 7, 1.5);
  }
  // 몸통 + 머리(말)
  g.fillStyle(pal.main, 1);
  g.fillRoundedRect(-12, -14, 24, 9, 4);
  g.strokeRoundedRect(-12, -14, 24, 9, 4);
  g.fillRoundedRect(8, -19, 8, 7, 3);
  g.strokeRoundedRect(8, -19, 8, 7, 3);
  g.fillStyle(COL.outline, 1);
  g.fillCircle(14, -16.5, 1); // 말 눈
  // 기수
  const bodyY = -25 + pose.bob;
  g.fillStyle(pal.sub, 1);
  g.fillRoundedRect(-5, bodyY, 9, 11, 3);
  g.strokeRoundedRect(-5, bodyY, 9, 11, 3);
  drawHead(g, faction, FACTION_PALETTES[faction], -0.5, bodyY - 6, role);
  g.save();
  g.translateCanvas(5, bodyY + 3);
  g.rotateCanvas(pose.weaponSwing);
  outline(g);
  g.fillStyle(COL.steel, 1);
  g.fillRect(-1, -13, 3, 13); // 랜스/장창
  g.fillTriangle(-1, -15, 2, -15, 0.5, -18);
  g.restore();
  if (role === 'elite') {
    // 정예 오라 토큰
    g.lineStyle(2, pal.accent, 0.9);
    g.strokeEllipse(0, -8, 32, 14);
  }
}

/** 공성: 바퀴 수레 + 포신 */
function drawSiege(g: G, pal: FactionPalette, pose: Pose): void {
  outline(g);
  g.fillStyle(COL.woodDark, 1);
  g.fillRoundedRect(-13, -10, 26, 8, 3);
  g.strokeRoundedRect(-13, -10, 26, 8, 3);
  // 바퀴 (걷기 = 회전 스포크 위상)
  for (const wx of [-8, 8]) {
    g.fillStyle(COL.wood, 1);
    g.fillCircle(wx, -2, 4.5);
    g.strokeCircle(wx, -2, 4.5);
    g.lineStyle(1.5, COL.outline, 1);
    const a = (pose.legSwing / 3) * 0.8;
    g.lineBetween(wx - Math.cos(a) * 4, -2 - Math.sin(a) * 4, wx + Math.cos(a) * 4, -2 + Math.sin(a) * 4);
  }
  // 포신 (공격 시 반동)
  g.save();
  g.translateCanvas(-2 - pose.lunge, -12);
  g.rotateCanvas(-0.45 + pose.weaponSwing * 0.3);
  outline(g);
  g.fillStyle(pal.main, 1);
  g.fillRoundedRect(0, -3.5, 18, 7, 3);
  g.strokeRoundedRect(0, -3.5, 18, 7, 3);
  g.restore();
  g.fillStyle(pal.accent, 1);
  g.fillCircle(-8, -12, 3); // 탄환 더미
  g.strokeCircle(-8, -12, 3);
}
