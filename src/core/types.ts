// 시뮬 코어 타입 정의 — 모든 좌표는 타일 단위 float (렌더에서 TILE 곱해 픽셀화)

// 플레이어 인덱스 (0..N-1). 1v1=2인, 3v3=6인. 팀은 state.teams[player]로 매핑
export type PlayerId = number;
export type TeamId = number;
export type EntityId = number;

export type FactionId = 'psion' | 'murim' | 'fantasy' | 'yokai' | 'demon' | 'celestial' | 'dummy';

export type UnitRole = 'worker' | 'melee' | 'ranged' | 'cavalry' | 'siege' | 'caster' | 'elite';

export type UnitState =
  | 'idle'
  | 'moving'
  | 'attackMove'
  | 'attacking'
  | 'harvesting'
  | 'returning'
  | 'building'
  | 'casting'
  | 'dead';

export type ResourceKind = 'gold' | 'wood';

export interface Unit {
  id: EntityId;
  player: PlayerId;
  faction: FactionId;
  role: UnitRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number; // 초능력자 패시브 등
  state: UnitState;
  /** 이동 목적지 (타일 좌표) — 추격 등으로 매 틱 갱신될 수 있음 */
  destX: number;
  destY: number;
  /** 명령 원목적지 — 교전 후 attackMove 재개 지점 (destX와 분리, 유실 방지) */
  orderX: number;
  orderY: number;
  /** 공격 대상 엔티티 id (유닛/건물) */
  targetId: EntityId | 0;
  attackCooldown: number; // 남은 틱
  windup: number; // 공격 모션 남은 틱 (0이 되는 순간 타격)
  /** 일꾼: 운반 자원 */
  cargo: ResourceKind | null;
  cargoAmount: number;
  harvestTicks: number; // 채집 진행 틱
  harvestTargetId: EntityId | 0; // 금광 id 또는 0(목재는 타일)
  forestX: number; // 벌목 대상 타일
  forestY: number;
  buildTargetId: EntityId | 0; // 건설 중 건물 id
  stuckTicks: number;
  lastX: number;
  lastY: number;
  isSummoned: boolean;
  buffs: Buff[];
  spellCooldowns: Record<string, number>;
  /** 매혹: 0이 아니면 원소유주가 따로 있고 charmTicks 후 복귀 */
  charmOwner: PlayerId | -1;
  charmTicks: number;
  usedRevive: boolean; // 천계 불사 1회
  outOfCombatTicks: number;
}

export interface Buff {
  kind: string;
  ticks: number; // 남은 지속 틱
  power: number;
}

export type BuildingKind = 'hq' | 'farm' | 'barracks' | 'hall' | 'magetower' | 'forge' | 'tower';

export interface Building {
  id: EntityId;
  player: PlayerId;
  faction: FactionId;
  kind: BuildingKind;
  tier: 1 | 2 | 3; // hq만 의미
  tileX: number;
  tileY: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  buildProgress: number; // 0~1, 1=완성
  queue: ProduceOrder[];
  rallyX: number;
  rallyY: number;
  attackCooldown: number; // tower
}

export interface ProduceOrder {
  kind: 'unit' | 'upgrade' | 'tierUp';
  unitRole?: UnitRole;
  upgradeId?: string;
  ticksLeft: number;
  totalTicks: number;
}

export interface GoldMine {
  id: EntityId;
  tileX: number;
  tileY: number;
  w: number;
  h: number;
  remaining: number;
  collapsed: boolean;
}

export interface PlayerState {
  faction: FactionId;
  gold: number;
  wood: number;
  supply: number;
  supplyCap: number;
  upgrades: Record<string, number>; // weapon/armor 레벨 등
  defeated: boolean;
  summonCount: number;
}

export type CommandType =
  | 'move'
  | 'attackMove'
  | 'stop'
  | 'harvest'
  | 'build'
  | 'train'
  | 'tierUp'
  | 'upgrade'
  | 'cast'
  | 'surrender';

export interface Command {
  type: CommandType;
  player: PlayerId;
  unitIds?: EntityId[];
  x?: number;
  y?: number;
  targetId?: EntityId;
  buildingKind?: BuildingKind;
  buildingId?: EntityId;
  unitRole?: UnitRole;
  upgradeId?: string;
  spellId?: string;
}

/** 게임 단위 사용률/행동 카운터 (dead 콘텐츠 경보용, 플랜 §5-3) */
export interface UsageCounters {
  unitsProduced: Record<string, number>;
  spellsCast: Record<string, number>;
  engagements: number;
  buildingsBuilt: Record<string, number>;
  /** 종족별 캐스터 생산 (스펠 dead 진단용) */
  castersByFaction: Record<string, number>;
}
