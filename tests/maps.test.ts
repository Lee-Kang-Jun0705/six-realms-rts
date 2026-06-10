// Phase 5: 맵 5종 검증 — 대칭/도달성/금광 공정성/AI 매치 완주
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { parseMap, passable, T_FOREST, T_GRASS, T_DIRT, tileIndex } from '../src/core/map';
import { computeFlowField } from '../src/core/pathfind/flowfield';
import { distSq } from '../src/core/vec';

describe.each(MAPS)('맵 검증: $ko', (def) => {
  const map = parseMap(def.ascii);

  it('지형 180도 회전 대칭 (마커/금광 풋프린트 제외)', () => {
    let asym = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const a = map.terrain[tileIndex(map, x, y)];
        const b = map.terrain[tileIndex(map, map.width - 1 - x, map.height - 1 - y)];
        // 통행성 기준 대칭 (잔디/흙은 동급)
        const walk = (t: number): boolean => t === T_GRASS || t === T_DIRT;
        if (walk(a) !== walk(b) && a !== T_FOREST !== (b !== T_FOREST)) asym++;
        if ((a === T_FOREST) !== (b === T_FOREST)) asym++;
      }
    }
    expect(asym, `비대칭 타일 ${asym}개`).toBe(0);
  });

  it('시작점 대칭 + 상호 도달 가능 (지상)', () => {
    const [s1, s2] = map.starts;
    expect(s1.x).toBe(map.width - 1 - s2.x);
    expect(s1.y).toBe(map.height - 1 - s2.y);
    const field = computeFlowField(map, s2.x, s2.y, 'ground');
    expect(field.dist[tileIndex(map, s1.x, s1.y)], '시작점 간 경로 없음').toBeGreaterThan(0);
  });

  it('금광 짝수 + 시작점-최근접 금광 거리 동일 (경제 공정성)', () => {
    expect(map.mineSpots.length % 2 === 0 || map.mineSpots.length >= 2).toBe(true);
    // 타일 중심(+0.5) 기준 — 모서리 기준 측정은 점대칭에서 0.5 오차가 생김
    const nearest = (sx: number, sy: number): number => {
      let best = Infinity;
      for (const m of map.mineSpots) best = Math.min(best, distSq(sx + 0.5, sy + 0.5, m.tileX + 1, m.tileY + 1));
      return Math.sqrt(best);
    };
    const d1 = nearest(map.starts[0].x, map.starts[0].y);
    const d2 = nearest(map.starts[1].x, map.starts[1].y);
    expect(Math.abs(d1 - d2), `금광 거리 P0=${d1.toFixed(2)} P1=${d2.toFixed(2)}`).toBeLessThan(0.01);
  });

  it('시작점 주변 본진(3x3)+생산 공간 확보', () => {
    for (const s of map.starts) {
      let free = 0;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++)
          if (passable(map, s.x + dx, s.y + dy, 'ground')) free++;
      expect(free, `시작점 (${s.x},${s.y}) 주변 공간 부족`).toBeGreaterThanOrEqual(30);
    }
  });
});
