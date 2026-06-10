// DOM HUD — 자원바 / 선택 패널 / 커맨드 카드 / 토스트 (한국어 라벨)

import type { GameState } from '../core/state';
import type { InputController } from '../render/input';
import type { SimRunner } from '../render/SimRunner';
import type { BuildingKind, UnitRole } from '../core/types';
import { BUILDING_STATS, TIER_UP, UNIT_STATS, UPGRADES } from '../data/baseline';
import { spellsOf } from '../data/spells';
import { findBuilding } from '../core/state';
import { SUPPLY_CAP } from '../core/const';

const ROLE_KO: Record<UnitRole, string> = {
  worker: '일꾼', melee: '근접병', ranged: '사수', cavalry: '기동대', siege: '공성기', caster: '술사', elite: '정예',
};
const KIND_KO: Record<BuildingKind, string> = {
  hq: '본진', farm: '농장', barracks: '병영', hall: '전당', magetower: '마법탑', forge: '대장간', tower: '방어탑',
};
const UPGRADE_KO: Record<string, string> = { weapon: '공격 강화', armor: '방어 강화', elite: '정예 전환' };

export class Hud {
  root: HTMLDivElement;
  private resBar: HTMLDivElement;
  private infoPanel: HTMLDivElement;
  private cardPanel: HTMLDivElement;
  private toastEl: HTMLDivElement;
  private toastTimer = 0;
  minimapCanvas: HTMLCanvasElement;

  constructor(private runner: SimRunner, private input: InputController, private player: 0 | 1, private spectate = false) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = HUD_CSS;
    this.resBar = el('div', 'hud-res');
    this.infoPanel = el('div', 'hud-info');
    this.cardPanel = el('div', 'hud-card');
    this.toastEl = el('div', 'hud-toast');
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.className = 'hud-minimap';
    const bottom = el('div', 'hud-bottom');
    bottom.append(this.minimapCanvas, this.infoPanel, this.cardPanel);
    this.root.append(this.resBar, bottom, this.toastEl);
    document.body.appendChild(this.root);
    input.onSelectionChange = () => this.renderCard();
    input.onToast = (m) => this.toast(m);
    this.renderCard();
  }

  private get state(): GameState {
    return this.runner.state;
  }

  destroy(): void {
    this.root.remove();
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    this.toastTimer = 2000;
  }

  update(deltaMs: number): void {
    if (this.spectate) {
      // 관전: 양측 자원/병력 비교 패널
      const parts = this.state.players.map((p, i) => {
        const army = this.state.units.filter((u) => u.player === i && u.role !== 'worker').length;
        const workers = this.state.units.filter((u) => u.player === i && u.role === 'worker').length;
        const color = i === 0 ? '#3aa0ff' : '#ff5a52';
        return `<span style="color:${color};font-weight:800">[${i === 0 ? '청' : '적'}]</span> ⛏${p.gold} 🌲${p.wood} 👷${workers} ⚔${army}`;
      });
      const mins = Math.floor(this.state.tick / 20 / 60);
      const secs = Math.floor((this.state.tick / 20) % 60);
      this.resBar.innerHTML = `${parts.join('<span style="opacity:0.3"> | </span>')}<span style="margin-left:auto">⏱ ${mins}:${String(secs).padStart(2, '0')} · x${this.runner.speedMultiplier}</span>`;
      if (this.toastTimer > 0) {
        this.toastTimer -= deltaMs;
        if (this.toastTimer <= 0) this.toastEl.style.opacity = '0';
      }
      return;
    }
    const p = this.state.players[this.player];
    const cap = Math.min(p.supplyCap, SUPPLY_CAP);
    this.resBar.innerHTML =
      `<span class="g">⛏ ${p.gold}</span><span class="w">🌲 ${p.wood}</span>` +
      `<span class="${p.supply >= cap ? 'full' : ''}">👥 ${p.supply}/${cap}</span>`;
    if (this.toastTimer > 0) {
      this.toastTimer -= deltaMs;
      if (this.toastTimer <= 0) this.toastEl.style.opacity = '0';
    }
    this.renderInfo();
  }

  private renderInfo(): void {
    const sel = this.input.selection();
    if (this.input.selectedBuilding) {
      const b = findBuilding(this.state, this.input.selectedBuilding);
      if (b) {
        const q = b.queue.map((o) => (o.kind === 'unit' ? ROLE_KO[o.unitRole!] : o.kind === 'tierUp' ? '티어업' : UPGRADE_KO[o.upgradeId!] ?? o.upgradeId)).join(', ');
        const prog = b.queue[0] ? Math.round((1 - b.queue[0].ticksLeft / b.queue[0].totalTicks) * 100) : 0;
        this.infoPanel.innerHTML = `<b>${KIND_KO[b.kind]}${b.kind === 'hq' ? ` (T${b.tier})` : ''}</b><br>HP ${Math.ceil(b.hp)}/${b.maxHp}` +
          (b.buildProgress < 1 ? `<br>건설 ${Math.round(b.buildProgress * 100)}%` : '') +
          (q ? `<br>생산: ${q} (${prog}%)` : '');
        return;
      }
    }
    if (sel.length === 0) {
      this.infoPanel.innerHTML = '<span class="dim">유닛을 드래그로 선택하세요</span>';
      return;
    }
    const byRole = new Map<string, number>();
    for (const id of sel) {
      const u = this.state.units.find((x) => x.id === id);
      if (u) byRole.set(ROLE_KO[u.role], (byRole.get(ROLE_KO[u.role]) ?? 0) + 1);
    }
    this.infoPanel.innerHTML = `<b>선택 ${sel.length}기</b><br>` + [...byRole].map(([k, n]) => `${k}×${n}`).join(' ');
  }

  /** 컨텍스트 커맨드 카드 */
  renderCard(): void {
    this.cardPanel.innerHTML = '';
    if (this.input.selectedBuilding) return this.renderBuildingCard();
    const sel = this.input.selection();
    if (sel.length === 0) return;
    const hasWorker = sel.some((id) => this.state.units.find((u) => u.id === id && u.role === 'worker'));
    if (hasWorker) {
      for (const kind of ['farm', 'barracks', 'hall', 'magetower', 'forge', 'tower'] as BuildingKind[]) {
        const s = BUILDING_STATS[kind];
        this.button(`${KIND_KO[kind]}<small>${s.cost.gold}/${s.cost.wood}</small>`, () => this.input.enterBuildMode(kind));
      }
    }
    // 캐스터 스펠 버튼
    const caster = sel
      .map((id) => this.state.units.find((u) => u.id === id && u.role === 'caster'))
      .find((u) => u);
    if (caster) {
      for (const def of spellsOf(caster.faction)) {
        const cd = caster.spellCooldowns[def.id] ?? 0;
        this.button(`${def.ko}<small>${cd > 0 ? `재사용 ${Math.ceil(cd / 20)}초` : '준비됨'}</small>`, () => {
          this.input.enterCastMode(def.id);
        });
      }
    }
    this.button('정지 <small>S</small>', () => {
      this.runner.enqueue({ type: 'stop', player: this.player, unitIds: this.input.selection() });
    });
    this.button('어택땅 <small>A</small>', () => {
      this.input.mode = 'attackTarget';
    });
  }

  private renderBuildingCard(): void {
    const b = findBuilding(this.state, this.input.selectedBuilding);
    if (!b || b.buildProgress < 1) return;
    for (const role of BUILDING_STATS[b.kind].trains) {
      const s = UNIT_STATS[role];
      this.button(`${ROLE_KO[role]} 훈련<small>${s.cost.gold}/${s.cost.wood}</small>`, () => {
        this.runner.enqueue({ type: 'train', player: this.player, buildingId: b.id, unitRole: role });
      });
    }
    if (b.kind === 'hq' && b.tier < 3) {
      const def = TIER_UP[(b.tier + 1) as 2 | 3];
      this.button(`티어 ${b.tier + 1} 승급<small>${def.cost.gold}/${def.cost.wood}</small>`, () => {
        this.runner.enqueue({ type: 'tierUp', player: this.player, buildingId: b.id });
      });
    }
    if (b.kind === 'forge') {
      for (const id of ['weapon', 'armor']) this.upgradeButton(b.id, id);
    }
    if (b.kind === 'magetower') this.upgradeButton(b.id, 'elite');
  }

  private upgradeButton(buildingId: number, id: string): void {
    const def = UPGRADES[id];
    const lv = this.state.players[this.player].upgrades[id] ?? 0;
    if (lv >= def.maxLevel) return;
    this.button(`${UPGRADE_KO[id]} ${lv + 1}<small>${def.cost.gold}/${def.cost.wood}</small>`, () => {
      this.runner.enqueue({ type: 'upgrade', player: this.player, buildingId, upgradeId: id });
    });
  }

  private button(html: string, onClick: () => void): void {
    const btn = document.createElement('button');
    btn.className = 'hud-btn';
    btn.innerHTML = html;
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick();
      this.renderCard();
    };
    this.cardPanel.appendChild(btn);
  }
}

function el(tag: string, cls: string): HTMLDivElement {
  const d = document.createElement(tag) as HTMLDivElement;
  d.className = cls;
  return d;
}

const HUD_CSS = `<style>
#hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Pretendard', -apple-system, sans-serif; color: #e8e2d0; z-index: 10; }
.hud-res { position: absolute; top: 0; left: 0; right: 0; height: 34px; display: flex; gap: 18px; align-items: center;
  padding: 0 14px; background: rgba(12,14,20,0.85); border-bottom: 2px solid #20232b; font-weight: 700; font-size: 15px; }
.hud-res .g { color: #f5c542; } .hud-res .w { color: #7fd4a0; } .hud-res .full { color: #ff6a5e; }
.hud-bottom { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-end; gap: 10px; padding: 8px; }
.hud-minimap { width: 208px; height: 144px; background: #0c0e14; border: 2px solid #20232b; border-radius: 6px; pointer-events: auto; image-rendering: pixelated; }
.hud-info { min-width: 200px; min-height: 64px; background: rgba(12,14,20,0.85); border: 2px solid #20232b; border-radius: 8px; padding: 10px 14px; font-size: 14px; line-height: 1.5; }
.hud-info .dim { opacity: 0.55; }
.hud-card { margin-left: auto; display: grid; grid-template-columns: repeat(4, 96px); gap: 6px; pointer-events: auto; }
.hud-btn { height: 52px; background: #1a1e29; color: #e8e2d0; border: 2px solid #2c3140; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
.hud-btn:hover { background: #262c3c; border-color: #4a5468; }
.hud-btn small { display: block; opacity: 0.6; font-size: 11px; }
.hud-toast { position: absolute; top: 48px; left: 50%; transform: translateX(-50%); background: rgba(180,50,50,0.92);
  padding: 8px 18px; border-radius: 8px; font-weight: 700; opacity: 0; transition: opacity 0.3s; }
</style>`;
