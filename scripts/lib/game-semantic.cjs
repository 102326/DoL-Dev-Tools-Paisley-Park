'use strict';
// Shared Gameplay vocabulary. Providers resolve these intents against fresh
// original facts; this module owns no DOM, game-variable or version mapping.
// A declared intent is not a promise that a provider implements it.
const intents = Object.freeze(['navigation', 'dialogue', 'combat', 'buy', 'sell', 'equip', 'unequip', 'sleep', 'menu', 'settings', 'load-save']);
module.exports = { intents };
