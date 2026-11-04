'use strict';
const { findSource } = require('./engine.cjs');
require('./protocol.cjs').serve(async (request, signal) => {
  const result = await findSource(request, signal);
  if (process.send) process.send({ rssBytes: process.memoryUsage().rss });
  return result;
});
