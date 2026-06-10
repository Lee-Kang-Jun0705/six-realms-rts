import { runMatch } from '../lib/runMatch';
const r = runMatch({
  seed: 5,
  factions: ['psion', 'demon'],
  buildOrders: ['psion-tech', 'demon-tech'],
});
console.log('승자:', r.winner, '틱:', r.ticks);
console.log('생산:', r.unitsProduced);
console.log('스펠:', r.spellsCast);
console.log('건물:', r.buildingsBuilt);
console.log('빌드오더:', r.buildOrderNames);
