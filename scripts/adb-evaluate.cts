const fs:typeof import('node:fs')=require('node:fs');
const {connect}:typeof import('./lib/cdp.cjs')=require('./lib/cdp.cjs');

async function evaluate(endpoint:string, source:string, timeoutMs = 60000, targetId:unknown = null):Promise<unknown> {
  const client = await connect(endpoint, timeoutMs, undefined, targetId);
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

const api={evaluate};
export = api;
if (require.main === module) main().catch(error => { console.error((error as {message?:unknown}|null|undefined)?.message); process.exitCode = 1; });
