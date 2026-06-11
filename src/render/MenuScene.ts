// 메인 메뉴 — 종족 선택 + 스커미시 시작 (Phase 3에서 AI/관전/맵 선택 확장)

import Phaser from 'phaser';
import type { FactionId } from '../core/types';
import { FACTION_PALETTES } from './palette';
import { MAPS } from '../data/maps';

const PLAYABLE: FactionId[] = ['psion', 'murim', 'fantasy', 'yokai', 'demon', 'celestial'];

export class MenuScene extends Phaser.Scene {
  private picked: FactionId = 'psion';
  private pickedMap = ''; // '' = 랜덤
  private pickedDiff: 'easy' | 'normal' | 'hard' = 'normal';
  private menuEl: HTMLDivElement | null = null;

  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.18, '육계대전', {
        fontSize: '68px', color: '#f5c542', fontStyle: 'bold',
        stroke: '#1a0d12', strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 10, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.add
      .text(width / 2, height * 0.27, 'SIX REALMS RTS — 여섯 세계의 패권 전쟁', {
        fontSize: '18px', color: '#e8e2d0',
        shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 6, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.buildMenu();
    this.events.on('shutdown', () => this.menuEl?.remove());
  }

  private buildMenu(): void {
    const el = document.createElement('div');
    this.menuEl = el;
    el.innerHTML = `<style>
      .menu-bg { position: fixed; inset: 0; background: url(ui/menu-bg.jpg) center/cover no-repeat; z-index: 5; }
      .menu-bg::after { content: ''; position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(12,14,20,0.55) 0%, rgba(12,14,20,0.35) 40%, rgba(12,14,20,0.82) 100%); }
      .menu-wrap { position: fixed; top: 38%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column;
        gap: 14px; align-items: center; font-family: 'Pretendard', -apple-system, sans-serif; z-index: 20; }
      .menu-factions { display: flex; gap: 8px; }
      .menu-f { padding: 10px 16px; border-radius: 10px; border: 2px solid #2c3140; background: rgba(26,30,41,0.85); color: #e8e2d0;
        cursor: pointer; font-weight: 700; font-size: 14px; }
      .menu-f.on { border-color: #f5c542; background: rgba(42,36,16,0.9); }
      .menu-fac { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 92px; padding: 6px;
        border-radius: 12px; border: 2px solid #2c3140; background: rgba(20,24,33,0.82); cursor: pointer; }
      .menu-fac img { width: 72px; height: 72px; border-radius: 8px; object-fit: cover; background: rgba(0,0,0,0.3); }
      .menu-fac span { font-size: 13px; font-weight: 700; color: #e8e2d0; }
      .menu-fac.on { border-color: #f5c542; box-shadow: 0 0 14px rgba(245,197,66,0.5); transform: translateY(-3px); }
      .menu-fac:hover { border-color: #4a5468; }
      .menu-start { padding: 14px 42px; border-radius: 12px; border: 2px solid #4a5468; background: #2f6bd8; color: #fff;
        cursor: pointer; font-weight: 800; font-size: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
      .menu-start:hover { background: #3d7ae8; }
      .menu-start.spec, .menu-start.defense { background: rgba(26,30,41,0.9); font-size: 15px; padding: 10px 28px; }
      .menu-hint { color: #c3c8cf; font-size: 13px; text-shadow: 0 1px 3px #000; }
    </style>
    <div class="menu-bg"></div>
    <div class="menu-wrap">
      <div class="menu-factions menu-facrow"></div>
      <div class="menu-factions menu-maps"></div>
      <div class="menu-factions menu-diffs"></div>
      <button class="menu-start">스커미시 시작 (vs AI)</button>
      <button class="menu-start spec">AI 관전 모드 (자동 대전)</button>
      <button class="menu-start defense">디펜스 모드 (웨이브 생존)</button>
      <div class="menu-hint">조작: 드래그 선택 · 우클릭 명령 · A 어택땅 · Ctrl+1~9 부대지정 · WASD/엣지 스크롤 · 휠 줌 · P 일시정지 · M 음소거</div>
    </div>`;
    document.body.appendChild(el);
    const fwrap = el.querySelector('.menu-facrow')!;
    for (const f of PLAYABLE) {
      const btn = document.createElement('button');
      btn.className = 'menu-fac' + (f === this.picked ? ' on' : '');
      const img = document.createElement('img');
      img.src = `ui/portrait-${f}.png`;
      img.alt = FACTION_PALETTES[f].name;
      const label = document.createElement('span');
      label.textContent = FACTION_PALETTES[f].name;
      btn.append(img, label);
      btn.onclick = () => {
        this.picked = f;
        fwrap.querySelectorAll('.menu-fac').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
      };
      fwrap.appendChild(btn);
    }
    // 맵 선택 (기본 = 랜덤)
    const mwrap = el.querySelector('.menu-maps')!;
    const mapChoices = [{ id: '', ko: '🎲 랜덤 맵', desc: '' }, ...MAPS];
    for (const m of mapChoices) {
      const btn = document.createElement('button');
      btn.className = 'menu-f' + (m.id === this.pickedMap ? ' on' : '');
      btn.textContent = m.ko;
      btn.title = m.desc;
      btn.onclick = () => {
        this.pickedMap = m.id;
        mwrap.querySelectorAll('.menu-f').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
      };
      mwrap.appendChild(btn);
    }
    const enemyOf = (f: FactionId, seed: number): FactionId => {
      const others = PLAYABLE.filter((x) => x !== f);
      return others[seed % others.length];
    };
    // 난이도 선택
    const dwrap = el.querySelector('.menu-diffs')!;
    const diffs: { id: 'easy' | 'normal' | 'hard'; ko: string }[] = [
      { id: 'easy', ko: '쉬움' },
      { id: 'normal', ko: '보통' },
      { id: 'hard', ko: '어려움' },
    ];
    for (const d of diffs) {
      const btn = document.createElement('button');
      btn.className = 'menu-f' + (d.id === this.pickedDiff ? ' on' : '');
      btn.textContent = `AI ${d.ko}`;
      btn.onclick = () => {
        this.pickedDiff = d.id;
        dwrap.querySelectorAll('.menu-f').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
      };
      dwrap.appendChild(btn);
    }
    const launch = (mode: 'play' | 'spectate' | 'defense'): void => {
      el.remove();
      const seed = (Date.now() % 100000) | 0;
      this.scene.start('game', {
        factions: [this.picked, enemyOf(this.picked, seed)],
        seed,
        mapId: mode === 'defense' ? 'defense-valley' : this.pickedMap || undefined,
        mode,
        difficulty: this.pickedDiff,
      });
    };
    (el.querySelector('.menu-start:not(.spec):not(.defense)') as HTMLButtonElement).onclick = () => launch('play');
    (el.querySelector('.menu-start.spec') as HTMLButtonElement).onclick = () => launch('spectate');
    (el.querySelector('.menu-start.defense') as HTMLButtonElement).onclick = () => launch('defense');
  }
}
