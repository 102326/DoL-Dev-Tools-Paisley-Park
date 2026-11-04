// Generated from source-find.mts by TypeScript 6.0.2; source-lf-sha256=9a02dc32769de23e8cd6fa28652dbca2d7d43d56b81d588b3f20802c3eb48535
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceError = void 0;
exports.parseRequest = parseRequest;
exports.findSource = findSource;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const node_perf_hooks_1 = require("node:perf_hooks");
class SourceError extends Error {
    code;
    stage;
    constructor(code, stage) { super(code); this.code = code; this.stage = stage; }
}
exports.SourceError = SourceError;
const kinds = ['passage', 'widget', 'text', 'selector', 'event', 'symbol', 'path'];
function invalid() { throw new SourceError('SOURCE_REQUEST_INVALID', 'request'); }
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function keys(value, allowed) {
    if (Object.keys(value).some(k => !allowed.includes(k)))
        invalid();
}
/** Wire normalization is the only consumer of untrusted field shapes. */
function parseRequest(raw) {
    if (!record(raw))
        invalid();
    keys(raw, ['schemaVersion', 'root', 'revision', 'clues', 'limits']);
    if (raw.schemaVersion !== 1 || typeof raw.root !== 'string' || !path.isAbsolute(raw.root) || raw.root.includes('\0'))
        invalid();
    if (raw.revision !== undefined && (typeof raw.revision !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_./~-]{0,199}$/.test(raw.revision)))
        invalid();
    if (!Array.isArray(raw.clues) || raw.clues.length < 1 || raw.clues.length > 8)
        invalid();
    const clues = raw.clues.map(c => {
        if (!record(c))
            invalid();
        keys(c, ['kind', 'value']);
        if (!kinds.includes(c.kind) || typeof c.value !== 'string' || !c.value.trim() || c.value.length > 1024 || Array.from(c.value).length > 512 || /[\x00-\x1f\x7f]/.test(c.value))
            invalid();
        return { kind: c.kind, value: c.value };
    });
    const limits = { maxResults: 50, maxFiles: 2000, maxBytes: 8 * 1024 * 1024, contextLines: 1, timeoutMs: 10000 };
    if (raw.limits !== undefined) {
        if (!record(raw.limits))
            invalid();
        keys(raw.limits, Object.keys(limits));
        const maxima = { maxResults: 200, maxFiles: 20000, maxBytes: 32 * 1024 * 1024, contextLines: 3, timeoutMs: 60000 };
        for (const k of Object.keys(limits)) {
            const n = raw.limits[k];
            if (n === undefined)
                continue;
            if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < (k === 'contextLines' ? 0 : 1) || n > maxima[k])
                invalid();
            limits[k] = n;
        }
    }
    return { schemaVersion: 1, root: path.resolve(raw.root), ...(raw.revision === undefined ? {} : { revision: raw.revision }), clues, limits };
}
const excluded = new Set(['node_modules', 'artifacts', 'dist', 'build', 'coverage', 'profiles', 'profile', 'saves', 'save', 'logs', 'backups', 'vendor']);
const extensions = new Set(['.twee', '.tw', '.js', '.ts', '.mts', '.cts', '.tsx', '.jsx', '.cjs', '.mjs', '.css', '.scss', '.sass', '.less', '.html', '.htm', '.json', '.md']);
function allowed(file) {
    const segments = file.split('/');
    return !segments.some(s => s.startsWith('.') || excluded.has(s.toLowerCase())) && extensions.has(path.posix.extname(file).toLowerCase())
        && !/(?:^|[._-])(?:cookies|credentials|tokens|secrets)(?:[._-]|$)/i.test(segments.at(-1));
}
function cancelled(signal) {
    if (signal?.aborted)
        throw new SourceError('SOURCE_CANCELLED', 'search');
}
function git(root, args, signal) {
    cancelled(signal);
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)('git', ['--no-replace-objects', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', root, ...args], { env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), encoding: 'buffer', maxBuffer: 34 * 1024 * 1024, timeout: 10000, signal }, (error, stdout) => {
            if (signal?.aborted)
                reject(new SourceError('SOURCE_CANCELLED', 'search'));
            else if (error)
                reject(error);
            else
                resolve(stdout);
        });
    });
}
function definition(kind, line, value) {
    const s = line.trim();
    if (kind === 'passage')
        return s.startsWith('::') && s.slice(2).trim().split(/\s+[\[{]/)[0]?.trim() === value;
    if (kind === 'widget')
        return s.includes(`<<widget "${value}"`) || s.includes(`<<widget '${value}'`) || s.includes(`Macro.add("${value}"`) || s.includes(`Macro.add('${value}'`);
    if (kind === 'symbol')
        return ['function ', 'class ', 'const ', 'let ', 'var '].some(p => s.includes(p + value) && !/[\w$]/.test(s[s.indexOf(p + value) + p.length + value.length] ?? ''));
    return false;
}
/** Read-only literal candidate finder. Ranking is a heuristic, not a source/runtime mapping. */
async function findSource(raw, signal) {
    const request = parseRequest(raw);
    cancelled(signal);
    const deadline = AbortSignal.timeout(request.limits.timeoutMs);
    const until = node_perf_hooks_1.performance.now() + request.limits.timeoutMs;
    try {
        return await search(request, AbortSignal.any(signal ? [signal, deadline] : [deadline]), until);
    }
    catch (error) {
        if ((deadline.aborted || node_perf_hooks_1.performance.now() >= until) && !signal?.aborted)
            throw new SourceError('SOURCE_TIMEOUT', 'search');
        throw error;
    }
}
async function search(request, signal, until) {
    const active = () => { cancelled(signal); if (node_perf_hooks_1.performance.now() >= until)
        throw new SourceError('SOURCE_TIMEOUT', 'search'); };
    active();
    const reasons = new Set();
    let root;
    try {
        root = await fs.realpath(request.root);
        if (!(await fs.stat(root)).isDirectory())
            throw 0;
    }
    catch {
        throw new SourceError('SOURCE_ROOT_UNAVAILABLE', 'source');
    }
    let commit = null;
    let dirty = null;
    let mode = 'directory';
    let repositoryRoot = null;
    try {
        repositoryRoot = (await git(root, ['rev-parse', '--show-toplevel'], signal)).toString().replace(/\r?\n$/, '');
        commit = (await git(root, ['rev-parse', '--verify', 'HEAD^{commit}'], signal)).toString().trim();
        dirty = (await git(root, ['status', '--porcelain', '--untracked-files=normal', '--ignored=matching', '--', '.'], signal)).length > 0;
        mode = 'worktree';
    }
    catch (e) {
        active(); /* Non-Git directories are a supported explicit source. */
    }
    const entries = [];
    let skipped = 0;
    if (request.revision !== undefined) {
        try {
            if (repositoryRoot === null || await fs.realpath(repositoryRoot) !== root)
                throw 0;
            commit = (await git(root, ['rev-parse', '--verify', '--end-of-options', `${request.revision}^{commit}`], signal)).toString().trim();
            const listing = (await git(root, ['ls-tree', '-r', '-z', commit], signal)).toString();
            for (const item of listing.split('\0')) {
                if (!item)
                    continue;
                const match = /^(100644|100755) blob ([a-f0-9]{40,64})\t([\s\S]+)$/.exec(item);
                if (match && allowed(match[3]))
                    entries.push({ file: match[3], object: match[2] });
                else
                    skipped++;
                if (entries.length > 20000) {
                    reasons.add('enumeration-limit');
                    break;
                }
            }
            mode = 'revision';
            dirty = false;
        }
        catch {
            active();
            throw new SourceError('SOURCE_REVISION_UNAVAILABLE', 'source');
        }
    }
    else {
        let visited = 0;
        async function walk(relative) {
            active();
            let listing;
            try {
                listing = await fs.readdir(path.join(root, relative), { withFileTypes: true });
            }
            catch {
                reasons.add('directory-unreadable');
                return;
            }
            listing.sort((a, b) => a.name.localeCompare(b.name));
            for (const item of listing) {
                active();
                if (++visited > 50000) {
                    reasons.add('enumeration-limit');
                    return;
                }
                const file = relative ? `${relative}/${item.name}` : item.name;
                if (item.name.startsWith('.') || excluded.has(item.name.toLowerCase())) {
                    skipped++;
                    continue;
                }
                if (item.isDirectory())
                    await walk(file);
                else if (item.isFile() && allowed(file))
                    entries.push({ file });
                else
                    skipped++;
                if (visited > 50000)
                    return;
            }
        }
        await walk('');
    }
    entries.sort((a, b) => a.file.localeCompare(b.file));
    const candidates = [];
    let filesRead = 0, filesAttempted = 0, bytesRead = 0;
    // Keep only the best bounded candidates while scanning the remaining selected files.
    const compare = (a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line;
    for (const entry of entries) {
        active();
        if (filesAttempted >= request.limits.maxFiles) {
            reasons.add('max-files');
            break;
        }
        filesAttempted++;
        let buffer;
        try {
            if (entry.object) {
                const size = Number((await git(root, ['cat-file', '-s', entry.object], signal)).toString());
                if (size > request.limits.maxBytes - bytesRead) {
                    reasons.add('max-bytes');
                    continue;
                }
                buffer = await git(root, ['cat-file', 'blob', entry.object], signal);
            }
            else {
                const selected = path.join(root, entry.file);
                const real = await fs.realpath(selected);
                // Recheck all parents plus final file. This is best-effort containment, not an OS sandbox.
                const relative = path.relative(root, real);
                if (real !== selected || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
                    skipped++;
                    reasons.add('changed-or-linked-file');
                    continue;
                }
                const handle = await fs.open(selected, node_fs_1.constants.O_RDONLY | node_fs_1.constants.O_NOFOLLOW);
                try {
                    const stat = await handle.stat();
                    if (!stat.isFile()) {
                        reasons.add('changed-or-linked-file');
                        continue;
                    }
                    if (stat.size > request.limits.maxBytes - bytesRead) {
                        reasons.add('max-bytes');
                        continue;
                    }
                    // Bounded read even if another writer grows the file after stat().
                    const capacity = Math.min(stat.size + 1, request.limits.maxBytes - bytesRead + 1);
                    buffer = Buffer.alloc(capacity);
                    const read = await handle.read(buffer, 0, capacity, 0);
                    buffer = buffer.subarray(0, read.bytesRead);
                    if (read.bytesRead > stat.size) {
                        reasons.add('file-changed');
                        continue;
                    }
                    if (read.bytesRead < stat.size)
                        reasons.add('file-changed');
                }
                finally {
                    await handle.close();
                }
            }
        }
        catch {
            active();
            reasons.add('file-unreadable');
            continue;
        }
        filesRead++;
        bytesRead += buffer.length;
        if (buffer.includes(0)) {
            skipped++;
            reasons.add('binary-or-unsupported-encoding');
            continue;
        }
        let text;
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        }
        catch {
            skipped++;
            reasons.add('unsupported-encoding');
            continue;
        }
        const sha256 = (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex');
        active();
        const lines = text.split(/\r?\n/);
        active();
        for (let i = 0; i < lines.length; i++) {
            if (i % 128 === 0) {
                await new Promise(resolve => setImmediate(resolve));
                active();
            }
            const line = lines[i];
            const basis = [];
            let column = Infinity;
            request.clues.forEach((clue, index) => {
                if (clue.kind === 'path') {
                    if (i === 0 && entry.file.includes(clue.value)) {
                        basis.push({ clue: index, role: 'path' });
                        column = 1;
                    }
                    return;
                }
                const at = line.indexOf(clue.value);
                if (at < 0)
                    return;
                column = Math.min(column, at + 1);
                basis.push({ clue: index, role: definition(clue.kind, line, clue.value) ? 'definition' : 'reference' });
            });
            if (!basis.length)
                continue;
            active();
            // Count Unicode columns once, without allocating arrays proportional to a long line.
            let codepoints = 0;
            for (let offset = 0; offset < column - 1;) {
                if (offset % 16384 === 0)
                    active();
                offset += line.codePointAt(offset) > 0xffff ? 2 : 1;
                codepoints++;
            }
            column = codepoints + 1;
            const context = [];
            for (let j = Math.max(0, i - request.limits.contextLines); j <= Math.min(lines.length - 1, i + request.limits.contextLines); j++) {
                let excerpt = '', count = 0, truncated = false;
                for (const char of lines[j]) {
                    if (++count > 240) {
                        truncated = true;
                        break;
                    }
                    excerpt += char;
                }
                context.push({ line: j + 1, text: excerpt, truncated });
            }
            candidates.push({ file: entry.file, line: i + 1, column, sha256, basis, context, score: basis.reduce((sum, b) => sum + (b.role === 'definition' ? 10 : 1), 0) });
            if (candidates.length > request.limits.maxResults) {
                candidates.sort(compare);
                candidates.pop();
                reasons.add('max-results');
            }
        }
    }
    candidates.sort(compare);
    active();
    return { schemaVersion: 1, outcome: reasons.size ? 'partial' : candidates.length ? 'candidates' : 'none', complete: reasons.size === 0,
        source: { mode, commit, dirty, consistency: mode === 'revision' ? 'git-objects' : 'per-file-read' }, clues: request.clues, candidates,
        partialReasons: [...reasons].sort(), stats: { filesRead, filesAttempted, bytesRead, eligibleFiles: entries.length, skipped } };
}
