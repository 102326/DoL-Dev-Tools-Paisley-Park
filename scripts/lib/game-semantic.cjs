// Generated from game-semantic.cts by TypeScript 6.0.2; source-lf-sha256=8d6c6e1d7b825fbe4d9c8d8393f36d5a8c9394c556a571b32bd94a5ea288d138
"use strict";
// Shared Gameplay vocabulary. Providers resolve these intents against fresh
// original facts; this module owns no DOM, game-variable or version mapping.
// A declared intent is not a promise that a provider implements it.
const intents = Object.freeze(['navigation', 'dialogue', 'combat', 'buy', 'sell', 'equip', 'unequip', 'sleep', 'menu', 'settings', 'load-save', 'experiment', 'save', 'delete-save']);
const semantic = { intents };
module.exports = semantic;
