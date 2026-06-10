// 메인 메뉴 — 종족 선택 + 스커미시 시작 (Phase 3에서 AI/관전/맵 선택 확장)

import Phaser from 'phaser';
import type { FactionId } from '../core/types';
import { FACTION_PALETTES } from './palette';

const PLAYABLE: FactionId[] = ['psion', 'murim', 'fantasy', 'yokai', 'demon', 'celestial'];

export class MenuScene extends Phaser.Scene {
  private picked: FactionId = 'psion';
  private menuEl: HTMLDivElement | null = null;

  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.22, '육계대전', { fontSize: '64px', color: '#f5c542', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.32, 'SIX REALMS RTS — 여섯 세계의 패권 전쟁', { fontSize: '18px', color: '#9aa0ae' })
      .setOrigin(0.5);
    this.buildMenu();
    this.events.on('shutdown', () => this.menuEl?.remove());
  }

  private buildMenu(): void {
    const el = document.createElement('div');
    this.menuEl = el;
    el.innerHTML = `<style>
      .menu-wrap { position: fixed; top: 42%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column;
        gap: 14px; align-items: center; font-family: 'Pretendard', -apple-system, sans-serif; z-index: 20; }
      .menu-factions { display: flex; gap: 8px; }
      .menu-f { padding: 10px 16px; border-radius: 10px; border: 2px solid #2c3140; background: #1a1e29; color: #e8e2d0;
        cursor: pointer; font-weight: 700; font-size: 15px; }
      .menu-f.on { border-color: #f5c542; background: #2a2410; }
      .menu-start { padding: 14px 42px; border-radius: 12px; border: 2px solid #4a5468; background: #2f6bd8; color: #fff;
        cursor: pointer; font-weight: 800; font-size: 18px; }
      .menu-start:hover { background: #3d7ae8; }
      .menu-start.spec { background: #1a1e29; font-size: 15px; padding: 10px 28px; }
      .menu-hint { color: #9aa0ae; font-size: 13px; }
    </style>
    <div class="menu-wrap">
      <div class="menu-factions"></div>
      <button class="menu-start">스커미시 시작 (vs AI)</button>
      <button class="menu-start spec">AI 관전 모드 (자동 대전)</button>
      <div class="menu-hint">조작: 드래그 선택 · 우클릭 명령 · A 어택땅 · Ctrl+1~9 부대지정 · WASD/엣지 스크롤 · 휠 줌 · P 일시정지</div>
    </div>`;
    document.body.appendChild(el);
    const fwrap = el.querySelector('.menu-factions')!;
    for (const f of PLAYABLE) {
      const btn = document.createElement('button');
      btn.className = 'menu-f' + (f === this.picked ? ' on' : '');
      btn.textContent = FACTION_PALETTES[f].name;
      btn.onclick = () => {
        this.picked = f;
        fwrap.querySelectorAll('.menu-f').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
      };
      fwrap.appendChild(btn);
    }
    const enemyOf = (f: FactionId, seed: number): FactionId => {
      const others = PLAYABLE.filter((x) => x !== f);
      return others[seed % others.length];
    };
    (el.querySelector('.menu-start:not(.spec)') as HTMLButtonElement).onclick = () => {
      el.remove();
      const seed = (Date.now() % 100000) | 0;
      this.scene.start('game', {
        factions: [this.picked, enemyOf(this.picked, seed)],
        seed,
        mode: 'play',
      });
    };
    (el.querySelector('.menu-start.spec') as HTMLButtonElement).onclick = () => {
      el.remove();
      const seed = (Date.now() % 100000) | 0;
      this.scene.start('game', {
        factions: [this.picked, enemyOf(this.picked, seed)],
        seed,
        mode: 'spectate',
      });
    };
  }
}
