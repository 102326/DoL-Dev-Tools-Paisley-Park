// Generated native comparison view from source-find.cts; edit the CTS source.
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { performance } from 'node:perf_hooks';

export type Kind = 'passage' | 'widget' | 'text' | 'selector' | 'event' | 'symbol' | 'path';
export type Code = 'SOURCE_REQUEST_INVALID' | 'SOURCE_ROOT_UNAVAILABLE' | 'SOURCE_REVISION_UNAVAILABLE' | 'SOURCE_READ_FAILED' | 'SOURCE_CANCELLED' | 'SOURCE_TIMEOUT';
export type Stage = 'request' | 'source' | 'search';
export class SourceError extends Error {
  readonly code: Code;
  readonly stage: Stage;
  constructor(code: Code, stage: Stage) { super(code); this.code = code; this.stage = stage; }
}
export interface Request {
  schemaVersion: 1;
  root: string;
  revision?: string;
  clues: { kind: Kind; value: string }[];
  limits: { maxResults: number; maxFiles: number; maxBytes: number; contextLines: number; timeoutMs: number };
}
export interface Candidate {
  file: string; line: number; column: number; sha256: string; score: number;
  basis: { clue: number; role: 'definition' | 'reference' | 'path' }[];
  context: { line: number; column: number; text: string; truncated: boolean }[];
}
export interface Result {
  schemaVersion: 1;
  outcome: 'none' | 'candidates' | 'partial'; complete: boolean;
  source: { mode: 'directory' | 'worktree' | 'revision'; commit: string | null; dirty: boolean | null; consistency: 'per-file-read' | 'git-objects' };
  clues: Request['clues']; candidates: Candidate[]; partialReasons: string[];
  stats: { filesRead: number; filesAttempted: number; bytesRead: number; eligibleFiles: number; skipped: number };
}
const kinds: Kind[] = ['passage', 'widget', 'text', 'selector', 'event', 'symbol', 'path'];
function invalid(): never { throw new SourceError('SOURCE_REQUEST_INVALID', 'request'); }
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(k => !allowed.includes(k))) invalid();
}
/** Wire normalization is the only consumer of untrusted field shapes. */
export function parseRequest(raw: unknown): Request {
  if (!record(raw)) invalid();
  keys(raw, ['schemaVersion', 'root', 'revision', 'clues', 'limits']);
  if (raw.schemaVersion !== 1 || typeof raw.root !== 'string' || !path.isAbsolute(raw.root) || raw.root.includes('\0')) invalid();
  if (raw.revision !== undefined && (typeof raw.revision !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_./~-]{0,199}$/.test(raw.revision))) invalid();
  if (!Array.isArray(raw.clues) || raw.clues.length < 1 || raw.clues.length > 8) invalid();
  const clues = raw.clues.map(c => {
    if (!record(c)) invalid();
    keys(c, ['kind','value']);
    if (!kinds.includes(c.kind as Kind) || typeof c.value !== 'string' || !c.value.trim() || c.value.length > 1024 || Array.from(c.value).length > 512 || /[\x00-\x1f\x7f]/.test(c.value)) invalid();
    return { kind: c.kind as Kind, value: c.value };
  });
  const limits = { maxResults: 50, maxFiles: 2000, maxBytes: 8 * 1024 * 1024, contextLines: 1, timeoutMs: 10000 };
  if (raw.limits !== undefined) {
    if (!record(raw.limits)) invalid();
    keys(raw.limits, Object.keys(limits));
    const maxima = { maxResults: 200, maxFiles: 20000, maxBytes: 32 * 1024 * 1024, contextLines: 3, timeoutMs: 60000 };
    for (const k of Object.keys(limits) as (keyof typeof limits)[]) {
      const n = raw.limits[k];
      if (n === undefined) continue;
      if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < (k === 'contextLines' ? 0 : 1) || n > maxima[k]) invalid();
      limits[k] = n;
    }
  }
  return { schemaVersion: 1, root: path.resolve(raw.root), ...(raw.revision === undefined ? {} : {revision: raw.revision as string}), clues, limits };
}
const excluded = new Set(['node_modules','artifacts','dist','build','coverage','profiles','profile','saves','save','logs','backups','vendor']);
const extensions = new Set(['.twee','.tw','.js','.ts','.mts','.cts','.tsx','.jsx','.cjs','.mjs','.css','.scss','.sass','.less','.html','.htm','.json','.md']);
function allowed(file: string): boolean {
  const segments = file.split('/');
  return !segments.some(s => s.startsWith('.') || excluded.has(s.toLowerCase())) && extensions.has(path.posix.extname(file).toLowerCase())
    && !/(?:^|[._-])(?:cookies|credentials|tokens|secrets)(?:[._-]|$)/i.test(segments.at(-1)!);
}
function cancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new SourceError('SOURCE_CANCELLED','search');
}
function git(root: string, args: string[], signal?: AbortSignal, input?: string): Promise<Buffer> {
  cancelled(signal);
  return new Promise((resolve, reject) => {
    let inputError: Error | undefined;
    // Local lookup must not fetch promisor objects, including excluded paths.
    const child = execFile('git', ['--no-replace-objects', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', root, ...args],
      { env: {...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_NO_LAZY_FETCH:'1', GIT_ALLOW_PROTOCOL:''}, encoding: 'buffer', maxBuffer: 34 * 1024 * 1024, timeout: 10000, signal }, (error, stdout) => {
        if (signal?.aborted) reject(new SourceError('SOURCE_CANCELLED','search'));
        else if (error || inputError) reject(error || inputError);
        else resolve(stdout);
      });
    if (input !== undefined) {
      child.stdin!.on('error', (error: Error) => { inputError = error; child.kill(); });
      child.stdin!.end(input);
    }
  });
}
interface Entry { file: string; object?: string; size?: number; }
/** Only tree-selected hex IDs enter stdin; bodies are byte-framed, never line-decoded. */
async function blobs(root: string, entries: Entry[], signal: AbortSignal): Promise<Map<string, Buffer | null>> {
  const selected = new Map(entries.map(entry => [entry.object!, entry.size!]));
  const output = await git(root, ['cat-file','--batch'], signal, [...selected.keys()].join('\n') + '\n');
  const result = new Map<string, Buffer | null>();
  let offset = 0;
  for (const [object, size] of selected) {
    const end = output.indexOf(10, offset);
    if (end < offset || end - offset > 128) throw new Error('SOURCE_BATCH_INVALID');
    const header = output.toString('utf8',offset,end);
    offset = end + 1;
    if (header === `${object} missing`) { result.set(object,null); continue; }
    if (header !== `${object} blob ${size}` || size > output.length - offset - 1 || output[offset + size] !== 10) throw new Error('SOURCE_BATCH_INVALID');
    result.set(object,output.subarray(offset,offset + size));
    offset += size + 1;
  }
  if (offset !== output.length) throw new Error('SOURCE_BATCH_INVALID');
  return result;
}
function definition(kind: Kind, line: string, value: string): boolean {
  const s = line.trim();
  if (kind === 'passage') return s.startsWith('::') && s.slice(2).trim().split(/\s+[\[{]/)[0]?.trim() === value;
  if (kind === 'widget') return s.includes(`<<widget "${value}"`) || s.includes(`<<widget '${value}'`) || s.includes(`Macro.add("${value}"`) || s.includes(`Macro.add('${value}'`);
  if (kind === 'symbol') return ['function ', 'class ', 'const ', 'let ', 'var '].some(p => s.includes(p + value) && !/[\w$]/.test(s[s.indexOf(p + value) + p.length + value.length] ?? ''));
  return false;
}
/** Read-only literal candidate finder. Ranking is a heuristic, not a source/runtime mapping. */
export async function findSource(raw: unknown, signal?: AbortSignal): Promise<Result> {
  const request = parseRequest(raw);
  cancelled(signal);
  const deadline = AbortSignal.timeout(request.limits.timeoutMs);
  const until = performance.now() + request.limits.timeoutMs;
  try { return await search(request, AbortSignal.any(signal ? [signal,deadline] : [deadline]), until); }
  catch (error) {
    if ((deadline.aborted || performance.now() >= until) && !signal?.aborted) throw new SourceError('SOURCE_TIMEOUT','search');
    throw error;
  }
}
async function search(request: Request, signal: AbortSignal, until: number): Promise<Result> {
  const active = () => { cancelled(signal); if (performance.now() >= until) throw new SourceError('SOURCE_TIMEOUT','search'); };
  active();
  const reasons = new Set<string>();
  let root: string;
  try { root = await fs.realpath(request.root); if (!(await fs.stat(root)).isDirectory()) throw 0; }
  catch { throw new SourceError('SOURCE_ROOT_UNAVAILABLE','source'); }
  let commit: string | null = null;
  let dirty: boolean | null = null;
  let mode: Result['source']['mode'] = 'directory';
  let repositoryRoot: string | null = null;
  try {
    repositoryRoot = (await git(root, ['rev-parse','--show-toplevel'],signal)).toString().replace(/\r?\n$/,'');
    commit = (await git(root, ['rev-parse','--verify','HEAD^{commit}'],signal)).toString().trim();
    dirty = (await git(root, ['status','--porcelain','--untracked-files=normal','--ignored=matching','--','.'],signal)).length > 0;
    mode = 'worktree';
  } catch (e) { active(); /* Non-Git directories are a supported explicit source. */ }
  const entries: Entry[] = [];
  let skipped = 0;
  if (request.revision !== undefined) {
    try {
      if (repositoryRoot === null || await fs.realpath(repositoryRoot) !== root) throw 0;
      commit = (await git(root,['rev-parse','--verify','--end-of-options',`${request.revision}^{commit}`],signal)).toString().trim();
      const listing = (await git(root,['ls-tree','-r','-l','-z',commit],signal)).toString();
      for (const item of listing.split('\0')) {
        if (!item) continue;
        const match = /^(100644|100755) blob ([a-f0-9]{40,64}) +([^ \t]+)\t([\s\S]+)$/.exec(item);
        // Git prints BAD for unavailable sizes. Keep the file eligible and attempted.
        if (match && allowed(match[4]!)) entries.push({file:match[4]!,object:match[2]!,
          ...(/^\d+$/.test(match[3]!) && Number.isSafeInteger(Number(match[3])) ? {size:Number(match[3])} : {})});
        else skipped++;
        if (entries.length > 20000) { reasons.add('enumeration-limit'); break; }
      }
      mode = 'revision'; dirty = false;
    } catch { active(); throw new SourceError('SOURCE_REVISION_UNAVAILABLE','source'); }
  } else {
    let visited = 0;
    async function walk(relative: string): Promise<void> {
      active();
      let listing;
      try { listing = await fs.readdir(path.join(root,relative),{withFileTypes:true}); }
      catch { reasons.add('directory-unreadable'); return; }
      listing.sort((a,b) => a.name.localeCompare(b.name));
      for (const item of listing) {
        active();
        if (++visited > 50000) { reasons.add('enumeration-limit'); return; }
        const file = relative ? `${relative}/${item.name}` : item.name;
        if (item.name.startsWith('.') || excluded.has(item.name.toLowerCase())) { skipped++; continue; }
        if (item.isDirectory()) await walk(file);
        else if (item.isFile() && allowed(file)) entries.push({file});
        else skipped++;
        if (visited > 50000) return;
      }
    }
    await walk('');
  }
  entries.sort((a,b) => a.file.localeCompare(b.file));
  const candidates: Candidate[] = [];
  let filesRead = 0, filesAttempted = 0, bytesRead = 0;
  let cached = new Map<string, Buffer | null>();
  // Keep only the best bounded candidates while scanning the remaining selected files.
  const compare = (a: Candidate, b: Candidate) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line;
  for (const [index, entry] of entries.entries()) {
    active();
    if (filesAttempted >= request.limits.maxFiles) { reasons.add('max-files'); break; }
    filesAttempted++;
    let buffer: Buffer;
    try {
      if (entry.object) {
        if (entry.size === undefined) throw new Error('SOURCE_BLOB_UNAVAILABLE');
        if (entry.size! > request.limits.maxBytes - bytesRead) { reasons.add('max-bytes'); continue; }
        if (!cached.has(entry.object)) {
          const window: Entry[] = [];
          let bytes = 0;
          // Bound prefetch by attempted files and remaining bytes, counting duplicate files too.
          const end = Math.min(entries.length,index + 128,index + request.limits.maxFiles - filesAttempted + 1);
          for (let next = index; next < end; next++) {
            const item = entries[next]!;
            if (item.size === undefined) continue;
            if (item.size! > request.limits.maxBytes - bytesRead - bytes) continue;
            if (window.length && bytes + item.size! > 1024 * 1024) break;
            window.push(item); bytes += item.size!;
          }
          cached = await blobs(root, window, signal);
        }
        const body = cached.get(entry.object);
        if (!body) throw new Error('SOURCE_BLOB_UNAVAILABLE');
        buffer = body;
      } else {
        const selected = path.join(root,entry.file);
        const real = await fs.realpath(selected);
        // Recheck all parents plus final file. This is best-effort containment, not an OS sandbox.
        const relative = path.relative(root,real);
        if (real !== selected || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) { skipped++; reasons.add('changed-or-linked-file'); continue; }
        const handle = await fs.open(selected, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          const stat = await handle.stat();
          if (!stat.isFile()) { reasons.add('changed-or-linked-file'); continue; }
          if (stat.size > request.limits.maxBytes - bytesRead) { reasons.add('max-bytes'); continue; }
          // Bounded read even if another writer grows the file after stat().
          const capacity = Math.min(stat.size + 1,request.limits.maxBytes - bytesRead + 1);
          buffer = Buffer.alloc(capacity);
          const read = await handle.read(buffer,0,capacity,0);
          buffer = buffer.subarray(0,read.bytesRead);
          if (read.bytesRead > stat.size) { reasons.add('file-changed'); continue; }
          if (read.bytesRead < stat.size) reasons.add('file-changed');
        } finally { await handle.close(); }
      }
    } catch { active(); reasons.add('file-unreadable'); continue; }
    filesRead++; bytesRead += buffer.length;
    if (buffer.includes(0)) { skipped++; reasons.add('binary-or-unsupported-encoding'); continue; }
    let text: string;
    try { text = new TextDecoder('utf-8',{fatal:true}).decode(buffer); }
    catch { skipped++; reasons.add('unsupported-encoding'); continue; }
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    active();
    const lines = text.split(/\r?\n/);
    active();
    for (let i=0; i<lines.length; i++) {
      if (i % 128 === 0) { await new Promise<void>(resolve => setImmediate(resolve)); active(); }
      const line = lines[i]!;
      const basis: Candidate['basis'] = [];
      let column = Infinity, textColumn = Infinity;
      request.clues.forEach((clue,index) => {
        if (clue.kind === 'path') {
          if (i === 0 && entry.file.includes(clue.value)) { basis.push({clue:index,role:'path'}); column = 1; }
          return;
        }
        const at = line.indexOf(clue.value);
        if (at < 0) return;
        column = Math.min(column,at + 1);
        textColumn = Math.min(textColumn,at + 1);
        basis.push({clue:index,role:definition(clue.kind,line,clue.value) ? 'definition' : 'reference'});
      });
      if (!basis.length) continue;
      active();
      // Count Unicode columns once, without allocating arrays proportional to a long line.
      let codepoints = 0;
      for (let offset=0; offset < column-1;) {
        if (offset % 16384 === 0) active();
        offset += line.codePointAt(offset)! > 0xffff ? 2 : 1; codepoints++;
      }
      if (textColumn !== Infinity && textColumn !== column) {
        let textCodepoints = 0;
        for (let offset=0; offset < textColumn-1;) {
          if (offset % 16384 === 0) active();
          offset += line.codePointAt(offset)! > 0xffff ? 2 : 1; textCodepoints++;
        }
        textColumn = textCodepoints + 1;
      } else textColumn = codepoints + 1;
      column = codepoints + 1;
      const context = [];
      for (let j=Math.max(0,i-request.limits.contextLines); j<=Math.min(lines.length-1,i+request.limits.contextLines); j++) {
        const contextLine = lines[j]!;
        let excerpt = '', count = 0, truncated = false;
        for (const char of contextLine) { if (++count > 240) { truncated = true; break; } excerpt += char; }
        let start = 0;
        if (truncated) {
          start = j === i ? Math.max(0,textColumn - 120) : 0;
          excerpt = ''; count = 0;
          const capacity = start ? 238 : 239;
          let more = false;
          for (const char of contextLine) {
            if (count % 16384 === 0) active();
            if (count++ < start) continue;
            if (count - start > capacity) { more = true; break; }
            excerpt += char;
          }
          excerpt = (start ? '…' : '') + excerpt + (more ? '…' : '');
        }
        context.push({line:j+1,column:start+1,text:excerpt,truncated});
      }
      candidates.push({file:entry.file,line:i+1,column,sha256,basis,context,score:basis.reduce((sum,b) => sum + (b.role === 'definition' ? 10 : 1),0)});
      if (candidates.length > request.limits.maxResults) { candidates.sort(compare); candidates.pop(); reasons.add('max-results'); }
    }
  }
  candidates.sort(compare);
  active();
  return {schemaVersion:1,outcome:reasons.size ? 'partial' : candidates.length ? 'candidates':'none',complete:reasons.size===0,
    source:{mode,commit,dirty,consistency:mode==='revision'?'git-objects':'per-file-read'},clues:request.clues,candidates,
    partialReasons:[...reasons].sort(),stats:{filesRead,filesAttempted,bytesRead,eligibleFiles:entries.length,skipped}};
}
