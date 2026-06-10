import { runMatch } from '../lib/runMatch';
import { MAPS } from '../../src/data/maps';
// psion-tech 강제, 긴 게임 유도 (vs fantasy eco)
for (const seed of [1, 2, 3]) {
  const r = runMatch({
    seed, factions: ['psion', 'fantasy'], mapAscii: MAPS[0].ascii,
    buildOrders: ['psion-tech', 'fantasy-eco'],
  });
  console.log(`seed=${seed} winner=${r.winner} ticks=${r.ticks} casters=`, r.castersByFaction,
    'spells=', Object.keys(r.spellsCast).join(','), '건물=', r.buildingsBuilt);
}
