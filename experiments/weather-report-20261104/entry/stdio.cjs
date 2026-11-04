'use strict';
const { findSource } = require('../source-finder/dist/engine.js');
require('./protocol.cjs').serve(async (request, signal) => {
  const result = await findSource(request, signal);
  if (process.send) process.send({ rssBytes: process.memoryUsage().rss });
  return result;
});
