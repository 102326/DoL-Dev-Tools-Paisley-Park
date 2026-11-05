// Generated from resolve.cts by TypeScript 6.0.2; source-lf-sha256=77d9370970efae4eb513784c332e7f8015bc9e991f9c7de3a6940aa2f9771b64
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRoot = validateRoot;
exports.resolve = resolve;
exports.describeError = describeError;
// Authoritative source; installed Skills run the standalone generated resolve.cjs.
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const errors = {
    RESOLVER_INSTALLATION_INVALID: ['resolve.installation', 'Incomplete Skill installation', 'Verify all installed files and install-manifest.json; preserve the existing directory and install a complete Skill into a new target.'],
    RESOLVER_LOCATION_INVALID: ['resolve.location', 'Invalid Tools location', 'Review tool-location.json or set DOL_DEV_TOOLS_HOME to an explicitly verified absolute Tools root; no alternate directory was searched.'],
    RESOLVER_ROOT_INVALID: ['resolve.root', 'Explicit absolute Tools root required', 'Use an absolute Tools root in DOL_DEV_TOOLS_HOME or tool-location.json; supplied input omitted.'],
    RESOLVER_ROOT_UNAVAILABLE: ['resolve.root', 'Tools root unavailable', 'Check the explicitly selected directory, its documentation and permissions; no fallback root or download was used.'],
    RESOLVER_METADATA_INVALID: ['resolve.metadata', 'Invalid Tools root metadata', 'Check the complete package.json: Paisley Park identity, supported displayName and nonempty version.'],
    RESOLVER_ENTRY_INVALID: ['resolve.entry', 'Invalid Tools root entry', 'Check scripts/dol-dev.cjs is a regular file inside the resolved Tools root; do not use an entry redirected elsewhere.'],
};
class ResolverError extends Error {
    code;
    stage;
    constructor(code) { super(errors[code][1]); this.code = code; this.stage = errors[code][0]; }
}
function fail(code) { throw new ResolverError(code); }
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function json(file, max, code) {
    try {
        if (!(0, node_fs_1.statSync)(file).isFile() || (0, node_fs_1.statSync)(file).size > max)
            return fail(code);
        return JSON.parse((0, node_fs_1.readFileSync)(file, 'utf8'));
    }
    catch {
        return fail(code);
    }
}
function verifyInstallation(skillDir, override) {
    const file = (0, node_path_1.join)(skillDir, 'install-manifest.json');
    try {
        if (!(0, node_fs_1.lstatSync)(file).isFile())
            fail('RESOLVER_INSTALLATION_INVALID');
    }
    catch (error) {
        if (object(error) && error.code === 'ENOENT')
            return;
        fail('RESOLVER_INSTALLATION_INVALID');
    }
    const record = json(file, 8192, 'RESOLVER_INSTALLATION_INVALID');
    const names = ['SKILL.md', 'scripts/resolve.cjs', 'agents/openai.yaml', 'tool-location.json'];
    if (!object(record) || record.schemaVersion !== 1 || !object(record.files) || Object.keys(record.files).length !== names.length)
        fail('RESOLVER_INSTALLATION_INVALID');
    const files = record.files;
    for (const name of names) {
        const digest = files[name];
        if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
            fail('RESOLVER_INSTALLATION_INVALID');
        try {
            const file = (0, node_path_1.join)(skillDir, name), stat = (0, node_fs_1.lstatSync)(file);
            if (!stat.isFile() || stat.size > 131072)
                fail('RESOLVER_INSTALLATION_INVALID');
            // Explicit relocation may supersede a stale location, never a missing payload file.
            if (!(override && name === 'tool-location.json') && (0, node_crypto_1.createHash)('sha256').update((0, node_fs_1.readFileSync)(file)).digest('hex') !== digest)
                fail('RESOLVER_INSTALLATION_INVALID');
        }
        catch {
            fail('RESOLVER_INSTALLATION_INVALID');
        }
    }
}
function validateRoot(candidate) {
    if (typeof candidate !== 'string' || !(0, node_path_1.isAbsolute)(candidate))
        fail('RESOLVER_ROOT_INVALID');
    let root;
    try {
        root = (0, node_fs_1.realpathSync)(candidate);
    }
    catch {
        return fail('RESOLVER_ROOT_UNAVAILABLE');
    }
    const metadata = json((0, node_path_1.join)(root, 'package.json'), 65536, 'RESOLVER_METADATA_INVALID');
    if (!object(metadata) || metadata.name !== 'dol-dev-tools-paisley-park' || metadata.displayName !== 'DoL Dev Tools' && metadata.displayName !== 'DoL Dev Tools: Paisley Park' ||
        typeof metadata.version !== 'string' || !metadata.version.trim() || metadata.version.length > 64)
        fail('RESOLVER_METADATA_INVALID');
    let cli;
    try {
        cli = (0, node_fs_1.realpathSync)((0, node_path_1.join)(root, 'scripts/dol-dev.cjs'));
        if (cli !== (0, node_path_1.join)(root, 'scripts/dol-dev.cjs') || !(0, node_fs_1.statSync)(cli).isFile())
            fail('RESOLVER_ENTRY_INVALID');
    }
    catch {
        return fail('RESOLVER_ENTRY_INVALID');
    }
    try {
        if (!(0, node_fs_1.statSync)((0, node_path_1.join)(root, 'docs/DIAGNOSTICS.md')).isFile())
            fail('RESOLVER_ROOT_UNAVAILABLE');
    }
    catch {
        return fail('RESOLVER_ROOT_UNAVAILABLE');
    }
    return { root, cli, name: metadata.displayName, version: metadata.version, docs: (0, node_path_1.join)(root, 'docs'), validation: 'location only; not a code trust guarantee' };
}
function resolve(skillDir = (0, node_path_1.resolve)(__dirname, '..'), env = process.env) {
    let candidate = env.DOL_DEV_TOOLS_HOME;
    verifyInstallation(skillDir, !!candidate);
    if (!candidate) {
        const location = (0, node_path_1.join)(skillDir, 'tool-location.json');
        let present = true;
        try {
            (0, node_fs_1.lstatSync)(location);
        }
        catch (error) {
            if (object(error) && error.code === 'ENOENT')
                present = false;
            else
                fail('RESOLVER_LOCATION_INVALID');
        }
        if (present) {
            const value = json(location, 65536, 'RESOLVER_LOCATION_INVALID');
            if (!object(value) || value.schemaVersion !== 1 || typeof value.toolRoot !== 'string')
                fail('RESOLVER_LOCATION_INVALID');
            candidate = value.toolRoot;
        }
        else
            candidate = (0, node_path_1.resolve)(skillDir, '../../..');
    }
    return validateRoot(candidate);
}
function describeError(error) {
    if (!(error instanceof ResolverError))
        return null;
    return { code: error.code, stage: error.stage, hint: errors[error.code][2] };
}
if (require.main === module) {
    try {
        console.log(JSON.stringify(resolve(), null, 2));
    }
    catch (error) {
        const detail = describeError(error);
        console.error('DoL Dev Tools location unavailable. ' + (detail ? `[${detail.code} stage=${detail.stage}] ${detail.hint}` : 'Cause unknown; supplied input and raw exception omitted. Check the verified Toolkit installation.'));
        process.exitCode = 1;
    }
}
