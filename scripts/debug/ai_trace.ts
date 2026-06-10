import { createGame, step } from '../../src/core/game';
import { AiController } from '../../src/core/ai/controller';
import { buildTestMap } from '../../src/data/maps';

const state = createGame({ mapAscii: buildTestMap(), seed: 5, factions: ['psion', 'demon'] });
const ai = new AiController({ player: 0, buildOrderId: 'psion-tech' });
const ai2 = new AiController({ player: 1, buildOrderId: 'demon-tech' });

for (let t = 0; t < 6000; t++) {
  const cmds = [...ai.tick(state), ...ai2.tick(state)];
  if (t % 400 === 0 || cmds.some((c) => c.type === 'build' || c.type === 'tierUp')) {
    const p = state.players[0];
    console.log(`t=${t} supply=${p.supply}/${p.supplyCap} g=${p.gold} w=${p.wood}`,
      cmds.filter((c) => c.player === 0).map((c) => `${c.type}:${c.buildingKind ?? c.unitRole ?? ''}`).join(','));
  }
  step(state, cmds);
}
console.log('건물:', state.buildings.filter((b) => b.player === 0).map((b) => b.kind).join(','));
