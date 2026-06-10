// 종족 스펠 핸들러 — 악용 차단 규칙 §2.2 적용 (소환캡/매혹 소유권/환급 제외)

import type { GameState } from './state';
import { findUnit, spawnUnit } from './state';
import type { Command, Unit } from './types';
import { SPELLS, SUMMON_CAP, type SpellDef } from '../data/spells';
import { registerSpell } from './spells';
import { damageUnit, effectivePlayer, killUnit } from './combat';
import { distSq, dirTo, clamp } from './vec';
import { passable } from './map';
import { ENTITY_HARD_CAP } from './const';

/** 시전자 검증 + 쿨다운 + 사거리 공통 게이트 */
function readyCaster(state: GameState, cmd: Command, def: SpellDef): Unit | null {
  for (const id of cmd.unitIds ?? []) {
    const u = findUnit(state, id);
    if (!u || u.role !== 'caster' || u.faction !== def.faction) continue;
    if (effectivePlayer(u) !== cmd.player) continue;
    if ((u.spellCooldowns[def.id] ?? 0) > 0) continue;
    if (def.range < 900 && cmd.x !== undefined && cmd.y !== undefined) {
      if (distSq(u.x, u.y, cmd.x, cmd.y) > def.range * def.range) continue;
    }
    return u;
  }
  return null;
}

function enemiesAround(state: GameState, player: number, x: number, y: number, radius: number): Unit[] {
  const out: Unit[] = [];
  state.grid.query(x, y, radius, out);
  return out.filter((n) => n.state !== 'dead' && effectivePlayer(n) !== player);
}

export function registerFactionSpells(): void {
  registerSpell('psi-blast', (state, cmd) => {
    const def = SPELLS['psi-blast'];
    if (cmd.x === undefined || cmd.y === undefined) return false;
    const caster = readyCaster(state, cmd, def);
    if (!caster) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    for (const n of enemiesAround(state, cmd.player, cmd.x, cmd.y, def.params.radius)) {
      damageUnit(state, caster, n, def.params.damage);
      if (n.state === 'dead') continue;
      // 넉백: 중심에서 바깥으로 (통행 가능 위치만)
      const d = dirTo(cmd.x, cmd.y, n.x, n.y);
      const px = clamp(n.x + d.x * def.params.knockback, 0.5, state.map.width - 0.5);
      const py = clamp(n.y + d.y * def.params.knockback, 0.5, state.map.height - 0.5);
      if (passable(state.map, Math.floor(px), Math.floor(py), 'ground')) {
        n.x = px;
        n.y = py;
      }
      n.windup = 0; // 시전/공격 끊김
    }
    return true;
  });

  registerSpell('psi-storm', (state, cmd) => {
    const def = SPELLS['psi-storm'];
    if (cmd.x === undefined || cmd.y === undefined) return false;
    const caster = readyCaster(state, cmd, def);
    if (!caster) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    for (const n of enemiesAround(state, cmd.player, cmd.x, cmd.y, def.params.radius)) {
      damageUnit(state, caster, n, def.params.damage);
    }
    return true;
  });

  registerSpell('clairvoyance', (state, cmd) => {
    const def = SPELLS['clairvoyance'];
    if (cmd.x === undefined || cmd.y === undefined) return false;
    const caster = readyCaster(state, cmd, def);
    if (!caster) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    state.revealers.push({
      player: cmd.player, x: cmd.x, y: cmd.y,
      radius: def.params.radius, untilTick: state.tick + def.params.duration,
    });
    return true;
  });

  registerSpell('imp-summon', (state, cmd) => {
    const def = SPELLS['imp-summon'];
    const caster = readyCaster(state, cmd, def);
    if (!caster) return false;
    const p = state.players[cmd.player];
    if (p.summonCount + def.params.count > SUMMON_CAP) return false; // 소환 총량 캡 (규칙 ⑤)
    if (state.units.length + def.params.count > ENTITY_HARD_CAP) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    for (let i = 0; i < def.params.count; i++) {
      const imp = spawnUnit(state, cmd.player, 'melee', caster.x + 0.6 * (i + 1), caster.y + 0.4, true);
      imp.hp = def.params.hp;
      imp.maxHp = def.params.hp;
      imp.buffs.push({ kind: 'expire', ticks: def.params.lifespan, power: 0 });
      imp.state = 'attackMove';
      imp.destX = caster.orderX;
      imp.destY = caster.orderY;
      imp.orderX = caster.orderX;
      imp.orderY = caster.orderY;
    }
    return true;
  });

  registerSpell('blood-aura', (state, cmd) => {
    const def = SPELLS['blood-aura'];
    const caster = readyCaster(state, cmd, def);
    if (!caster) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    const allies: Unit[] = [];
    state.grid.query(caster.x, caster.y, def.params.radius, allies);
    for (const n of allies) {
      if (n.state === 'dead' || effectivePlayer(n) !== cmd.player) continue;
      n.buffs.push({ kind: 'lifesteal', ticks: def.params.duration, power: def.params.lifesteal });
    }
    return true;
  });

  registerSpell('sacrifice', (state, cmd) => {
    const def = SPELLS['sacrifice'];
    const caster = readyCaster(state, cmd, def);
    if (!caster || !cmd.targetId) return false;
    const target = findUnit(state, cmd.targetId);
    // 소유권 의존 효과: 매혹 유닛 대상 불가 (규칙 ①), 자기 유닛만, 캐스터 자신 제외
    if (!target || target.player !== cmd.player || target.charmOwner >= 0 || target.id === caster.id) return false;
    if (distSq(caster.x, caster.y, target.x, target.y) > def.range * def.range) return false;
    caster.spellCooldowns[def.id] = def.cooldown;
    const x = target.x;
    const y = target.y;
    killUnit(state, target);
    for (const n of enemiesAround(state, cmd.player, x, y, def.params.radius)) {
      damageUnit(state, caster, n, def.params.damage);
    }
    return true;
  });
}
