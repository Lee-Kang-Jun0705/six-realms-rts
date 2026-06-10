import { buildTestMap } from '../../src/data/maps';
import { createGame, step } from '../../src/core/game';

const state = createGame({ mapAscii: buildTestMap(), seed: 7, factions: ['dummy', 'dummy'] });
console.log('mine[0]:', state.mines[0]);
console.log('hq p0:', state.buildings[0].tileX, state.buildings[0].tileY);
for (let t = 0; t <= 300; t++) {
  step(state, []);
  if (t % 60 === 0) {
    const w = state.units.find((u) => u.player === 0);
    console.log(`t=${t} gold=${state.players[0].gold} w0 state=${w?.state} pos=(${w?.x.toFixed(1)},${w?.y.toFixed(1)}) dest=(${w?.destX.toFixed(1)},${w?.destY.toFixed(1)}) cargo=${w?.cargoAmount} ht=${w?.harvestTicks} stuck=${w?.stuckTicks}`);
  }
}
