const fs = require('node:fs');
const { connect } = require('./lib/cdp.cjs');

async function evaluate(endpoint, source, timeoutMs = 60000) {
  const client = await connect(endpoint, timeoutMs);
  try {
    return await client.evaluate(source);
  } finally { client.close(); }
}

async function main() {
  const [source, destination] = process.argv.slice(2);
  if (!source || source === '--help') {
    console.log('Usage: node scripts/adb-evaluate.cjs <evaluation.js> [output.json]\nSet DOL_CDP_URL for a different forwarded port (default http://127.0.0.1:50806). Executes the supplied JavaScript in the game.');
    if (!source) process.exitCode = 1;
    return;
  }
  if (process.argv.length > 4) throw new Error('Unexpected arguments');
  const value = await evaluate(process.env.DOL_CDP_URL || 'http://127.0.0.1:50806', fs.readFileSync(source, 'utf8'));
  const output = JSON.stringify(value ?? null, null, 2);
  if (destination) fs.writeFileSync(destination, output, { flag: 'wx' });
  console.log(output);
}

module.exports = { evaluate };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
