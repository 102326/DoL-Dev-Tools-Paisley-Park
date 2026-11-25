'use strict';
// Uses Soft & Wet's actual Acrylic parameters in an owned, neutral interaction.
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { spawnSync } = require('node:child_process');

const source = 'src/theme/acrylic.ts';
const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Neutral Acrylic exercise</title>
<link rel="stylesheet" href="./styles.css">
<main><section id="panel">
  <h1>Neutral Acrylic exercise</h1>
  <button type="button" id="exercise">Exercise</button>
  <output id="count" data-count="0" aria-live="polite">0</output>
</section></main>
<script type="module" src="./release.js"></script>
`;
const css = `body{margin:0;font:18px system-ui;color:white;background:#263437}
main{min-height:100vh;display:grid;place-items:center;overflow:hidden;isolation:isolate}
main::before{content:"";position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(128deg,#223337,#517377 24px,#273a49 56px);opacity:.8}
#panel{padding:24px;max-width:85vw;background:var(--dgu-acrylic-axis-float);backdrop-filter:var(--dgu-acrylic-axis-float-filter);border-radius:18px}
#panel.moving{animation:exercise 1800ms linear}
button{font:inherit;padding:10px;margin-right:12px}
@keyframes exercise{0%,100%{transform:translateX(0)}25%{transform:translateX(24px)}75%{transform:translateX(-24px)}}
`;

function build(mode, out, python) {
  if (!['live', 'static'].includes(mode) || !path.isAbsolute(out)) throw Error('Specify live or static and an absolute new ZIP path');
  const projectCode = stripTypeScriptTypes(fs.readFileSync(source, 'utf8'), { mode: 'strip' });
  const script = `${projectCode}
const properties = acrylicParameters(acrylicDefault);
for (const [key, value] of Object.entries(properties)) {
  document.documentElement.style.setProperty(key, value);
}
if (${JSON.stringify(mode)} === 'static') document.documentElement.style.setProperty('--dgu-acrylic-axis-float-filter', 'none');
const panel = document.getElementById('panel');
const counter = document.getElementById('count');
document.getElementById('exercise').addEventListener('click', () => {
  if (panel.classList.contains('moving')) return;
  counter.dataset.count = String(Number(counter.dataset.count) + 1);
  counter.value = counter.dataset.count;
  panel.classList.add('moving');
});
panel.addEventListener('animationend', () => panel.classList.remove('moving'));
document.documentElement.dataset.fixture = 'ready';
`;
  const members = { 'index.html': html, 'release.js': script, 'styles.css': css };
  const unpacked = out + '.members';
  fs.mkdirSync(unpacked, { mode: 0o700 });
  for (const [name, bytes] of Object.entries(members)) fs.writeFileSync(path.join(unpacked, name), bytes, { flag: 'wx', mode: 0o600 });
  const zipped = spawnSync(python, ['-c', `import json, sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'x') as output:
 for name, source in sorted(json.load(sys.stdin).items()):
  output.writestr(zipfile.ZipInfo(name), source.encode("utf-8"))`, out], {
    input: JSON.stringify(members), encoding: 'utf8', stdio: ['pipe', 'ignore', 'ignore'], timeout: 10000, windowsHide: true,
  });
  if (zipped.status !== 0) throw Error('Unable to write new neutral Acrylic ZIP');
  console.log(JSON.stringify({ inputs: [source] }));
}
try { build(...process.argv.slice(2)); }
catch { console.error('Neutral Acrylic build failed. Check the reviewed source and new output paths.'); process.exitCode = 1; }
