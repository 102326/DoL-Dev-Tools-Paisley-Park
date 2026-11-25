'use strict';
// The neutral test author runs this inside the isolated operator directory only.
const fs = require('node:fs');
const path = require('node:path');
const operations = ['observe', 'check-load', 'check-behavior'];
const op = process.argv[2];
if (!operations.includes(op)) process.exit(2);
const request = path.join(__dirname, op + '.request');
const response = path.join(__dirname, op + '.json');
async function main() {
  fs.writeFileSync(request, '', { flag: 'wx', mode: 0o600 });
  const cutoff = Date.now() + 25000;
  while (!fs.existsSync(response) && Date.now() < cutoff) await new Promise(resolve => setTimeout(resolve, 50));
  const result = JSON.parse(fs.readFileSync(response, 'utf8'));
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
main().catch(() => { console.error('The isolated operation was unavailable. Stop and inspect the original handoff.'); process.exitCode = 1; });
