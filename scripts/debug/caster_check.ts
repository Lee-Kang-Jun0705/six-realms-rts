import { runMatch } from '../lib/runMatch';
let casters = 0; let spells = 0; let games = 0;
for (const seed of [3, 14, 25, 36, 47]) {
  const r = runMatch({ seed, factions: ['psion', 'demon'], buildOrders: ['psion-tech', 'demon-tech'] });
  games++;
  casters += r.unitsProduced['caster'] ?? 0;
  spells += Object.values(r.spellsCast).reduce((a, b) => a + b, 0);
  console.log(`seed=${seed} winner=${r.winner} ticks=${r.ticks} caster=${r.unitsProduced['caster'] ?? 0} spells=`, r.spellsCast);
}
console.log(`합계: ${games}게임 caster=${casters} spells=${spells}`);
