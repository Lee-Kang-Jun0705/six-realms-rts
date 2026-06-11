// AI 컨트롤러 — 모듈 오케스트레이션 + 반응 지연(시드 스트림) + APM 상한 + 대응 프리셋
// "사람처럼" 측정 기준 (플랜 §2.4): 치팅 0 / APM 상한 / 정찰 기반 대응 / 시드 지연

import type { GameState } from '../state';
import type { Command, PlayerId } from '../types';
import type { BuildOrder, Difficulty, Intel, Personality } from './types';
import { DIFFICULTIES } from './types';
import { createIntel, updateIntel } from './intel';
import { buildTickAi, economyTickAi, productionTickAi, type AiMemory } from './managers';
import { createSquadMemory, scoutTickAi, squadTickAi, type SquadMemory } from './squad';
import { buildOrdersOf } from '../../data/buildOrders';

export interface AiConfig {
  player: PlayerId;
  difficulty?: keyof typeof DIFFICULTIES;
  personality?: Partial<Personality>;
  buildOrderId?: string; // 미지정 = 시드 랜덤
}

export class AiController {
  readonly player: PlayerId;
  private diff: Difficulty;
  private pers: Personality;
  private bo: BuildOrder | null = null;
  private intel: Intel | null = null;
  private mem: AiMemory = {
    doneSteps: new Set(),
    workersTarget: 9,
    defensive: false,
    towersBuilt: 0,
    pendingBuild: new Map(),
  };
  private sq: SquadMemory = createSquadMemory();
  private reactAt = 0; // 러시 감지 → 지연 후 대응 (사람다움)
  private rushDetected = false;
  private boId: string | undefined;

  constructor(cfg: AiConfig) {
    this.player = cfg.player;
    this.diff = DIFFICULTIES[cfg.difficulty ?? 'normal'];
    this.pers = {
      aggression: 0.5, expandDesire: 0.5, techDesire: 0.5, harass: 0.5,
      ...cfg.personality,
    };
    this.boId = cfg.buildOrderId;
  }

  /** 매 틱 호출 — 의사결정 주기에만 명령 생성. AI 난수는 전용 시드 스트림(재현성) */
  tick(state: GameState): Command[] {
    if (state.winner !== -1) return [];
    if (!this.bo) this.pickBuildOrder(state);
    if (!this.intel) this.intel = createIntel(state, this.player);
    // 양측 동일 틱 결정 — 오프셋은 P0에 일관된 선행(300ms) 우위를 줘 포지션 편향 유발
    if (state.tick % this.diff.decisionInterval !== 0) return [];

    updateIntel(state, this.player, this.intel);
    this.reactionPresets(state);

    const cmds: Command[] = [];
    // 우선순위: 수비/경제 > 빌드 > 생산 > 정찰 > 분대
    economyTickAi(state, this.player, this.mem, cmds);
    buildTickAi(state, this.player, this.mem, this.bo!, cmds);
    productionTickAi(state, this.player, this.bo!, cmds); // 상시 — 건물/자원으로 자기 게이트 (빌드오더 완료 대기 = 데드락)
    scoutTickAi(state, this.player, this.sq, this.intel, this.diff.scoutInterval, cmds);
    squadTickAi(state, this.player, this.sq, this.intel, this.pers, this.bo!.attackArmyValue, cmds);

    // APM 상한 (사람다움): 수비(첫 명령들) 우선 유지하며 절단
    return cmds.slice(0, this.diff.apmCap);
  }

  /** 유한 대응 프리셋 (C-7: 완전 동적 재계획 금지) */
  private reactionPresets(state: GameState): void {
    const intel = this.intel!;
    // 프리셋 1: 초반 러시 감지 → 방어 모드 (반응 지연 = 시드 스트림 4~16틱 단위)
    const rushSignal =
      (intel.enemySeenBarracks >= 2 && state.tick < 4000) || (intel.threatNearBase > 150 && state.tick < 5000);
    if (rushSignal && !this.rushDetected) {
      this.rushDetected = true;
      const delay = state.streams.int('ai-delay', this.diff.reactionMin, this.diff.reactionMax, this.player + 1) * 4;
      this.reactAt = state.tick + delay;
    }
    if (this.rushDetected && state.tick >= this.reactAt) this.mem.defensive = true;
    if (this.mem.defensive && intel.threatNearBase === 0 && state.tick > 6000) this.mem.defensive = false;
    // 프리셋 2: 적 테크 감지 → 자체 티어업 욕구 상승 (빌드오더에 티어업 단계 없으면 추가 효과 없음 — 보수적)
    if (intel.enemySeenTier >= 2) this.pers.techDesire = Math.min(1, this.pers.techDesire + 0.3);
  }

  private pickBuildOrder(state: GameState): void {
    const faction = state.players[this.player].faction;
    const list = buildOrdersOf(faction);
    if (list.length === 0) throw new Error(`빌드오더 없음: ${faction}`);
    if (this.boId) {
      this.bo = list.find((b) => b.id === this.boId) ?? list[0];
    } else {
      // 시드 스트림으로 개막 랜덤 (재현 가능). player별 독립 스트림 = 미러전 P0/P1 대칭 (포지션 편향 차단)
      this.bo = list[state.streams.int('ai-delay', 0, list.length - 1, this.player + 1)];
    }
    this.mem.workersTarget = this.bo.workersTarget;
  }

  /** 관전/리포트용 */
  get buildOrderName(): string {
    return this.bo?.ko ?? '';
  }
}
