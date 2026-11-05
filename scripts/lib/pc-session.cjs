// Generated from pc-session.cts by TypeScript 6.0.2; source-lf-sha256=52b009686420f382ea206b707738d4f471e9596d4cecd036c53a5ab6559761fb
"use strict";
'use strict';
const fs = require('node:fs'), path = require('node:path'), { createHash, randomUUID } = require('node:crypto');
const { ChromeHost } = require('./chrome-host.cjs'), { target } = require('./runtime-target.cjs');
const { targets } = require('./cdp.cjs');
const invalid = () => Object.assign(Error('Invalid owned PC input'), { code: 'PC_INPUT_INVALID' });
function json(file, max = 16384) { try {
    if (!path.isAbsolute(file || '') || !fs.statSync(file).isFile() || fs.statSync(file).size > max)
        throw invalid();
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
catch {
    throw invalid();
} }
function record(file) {
    const r = json(file);
    if (!r || typeof r !== 'object' || Array.isArray(r) || typeof r.profilePath !== 'string' || typeof r.executable !== 'string' || typeof r.resourceDigest !== 'string' || r.format !== 'paisley-owned-chrome' || r.version !== 1 || !path.isAbsolute(r.profilePath || '') || !path.isAbsolute(r.executable || '') ||
        !/^[a-f0-9]{64}$/.test(r.resourceDigest || '') || r.target?.profilePath !== fs.realpathSync(r.profilePath))
        throw invalid();
    const validated = target(r.target);
    r.target = validated;
    if (validated.host !== 'chrome' || !validated.document)
        throw invalid();
    return r;
}
function save(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 }); }
async function pages(file) {
    const r = record(file), h = new ChromeHost(r.target);
    await h.verifyBrowser();
    return (await targets(r.target.endpoint)).filter(p => p.type === 'page').map(p => ({ targetId: p.id, url: p.url, title: p.title, sameOrigin: (() => { try {
            return new URL(p.url).origin === r.target.origin;
        }
        catch {
            return false;
        } })() }));
}
async function bind(file, targetId, url, out) {
    const r = record(file), wanted = new URL(url);
    if (!targetId || typeof out !== 'string' || !path.isAbsolute(out) || wanted.origin !== r.target.origin || wanted.username || wanted.password)
        throw invalid();
    const candidates = (await pages(file)).filter(p => p.targetId === targetId && p.url === wanted.href);
    if (candidates.length !== 1)
        throw Object.assign(Error('Select an exact live target ID and URL from pc-pages'), { code: 'PC_TARGET_UNAVAILABLE' });
    const fresh = { ...r.target, targetId };
    delete fresh.document;
    const h = await new ChromeHost(fresh).open();
    try {
        if (h.binding.url !== wanted.href)
            throw invalid();
        const next = { ...r, target: { ...fresh, document: h.binding } };
        save(out, next);
        return next;
    }
    finally {
        h.close();
    }
}
async function start(options) {
    if (!options.out || !path.isAbsolute(options.file || '') || !path.isAbsolute(options.chrome || '') || !['headless', 'visible'].includes(options.mode) || !/^[0-9]{4,5}$/.test(options.port || '') || options['allow-resource-update'] !== undefined && (options['allow-resource-update'] !== 'yes' || !options['resume-from']))
        throw invalid();
    const bundle = require('./pc-http.cjs').load(options.file, options.resources);
    const resume = options['resume-from'] ? record(options['resume-from']) : undefined;
    if (resume && (resume.resourceDigest !== bundle.digest && options['allow-resource-update'] !== 'yes' || resume.target.origin !== 'http://127.0.0.1:' + Number(options.port)))
        throw Object.assign(Error('Keep the original origin and review resource changes for a retained profile'), { code: 'PC_RESUME_IDENTITY_CHANGED' });
    const output = path.resolve(options.out);
    fs.mkdirSync(output, { mode: 0o700 });
    save(path.join(output, 'resources.json'), { schemaVersion: 1, resourceDigest: bundle.digest, inventory: bundle.inventory });
    const server = await require('./pc-http.cjs').serve(bundle, Number(options.port));
    let browser;
    try {
        browser = await require('./chrome-launch.cjs').launch({ out: path.join(output, 'chrome'), executable: options.chrome, url: server.url, mode: options.mode, resourceDigest: bundle.digest, resume, allowResourceUpdate: options['allow-resource-update'] === 'yes' });
    }
    catch (e) {
        await server.close();
        throw e;
    }
    return { ...browser, url: server.url, async stop() { let failure; try {
            await browser.stop();
        }
        catch (e) {
            failure = e;
        }
        finally {
            await server.close();
        } if (failure)
            throw failure; } };
}
async function capture(options, act = false) {
    const r = record(options['host-file']);
    const scope = options.scope || 'body';
    if (typeof scope !== 'string' || !scope.trim() || scope.length > 256 || !options.out)
        throw invalid();
    let action, probe;
    if (act) {
        if (options['test-environment'] !== 'yes')
            throw invalid();
        action = json(options.file, 65536);
        require('./action.cjs').validate(action);
        if (!action.type.startsWith('web-'))
            throw invalid();
    }
    if (options.probe) {
        if (!path.isAbsolute(options.probe) || fs.statSync(options.probe).size > 32768)
            throw invalid();
        probe = fs.readFileSync(options.probe, 'utf8');
        if (!probe.trim())
            throw invalid();
    }
    const output = path.resolve(options.out);
    fs.mkdirSync(output, { mode: 0o700 });
    const report = { schemaVersion: 1, incidentId: randomUUID(), capturedAt: new Date().toISOString(), status: 'not-dispatched',
        identity: { profileId: r.target.profileId, browserId: r.target.browserId, targetId: r.target.targetId, document: r.target.document },
        action: act ? require('./action.cjs').summary(action) : undefined, businessOutcome: 'not-inferred', automaticReplay: false, remoteCancellationGuaranteed: false,
        probeSha256: probe ? createHash('sha256').update(probe).digest('hex') : undefined, artifacts: [], privacy: 'Local; review screenshots, probe results and document URLs before sharing' };
    const checkpoint = () => { save(path.join(output, 'manifest.pending'), report); fs.renameSync(path.join(output, 'manifest.pending'), path.join(output, 'manifest.json')); };
    const artifact = (name, value, binary = false) => { const bytes = binary ? value : Buffer.from(JSON.stringify(value, null, 2)); fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx', mode: 0o600 }); report.artifacts.push({ file: name, sha256: createHash('sha256').update(bytes).digest('hex') }); };
    checkpoint();
    let host;
    try {
        host = await new ChromeHost(r.target).open();
        if (probe)
            artifact('state-before.json', await host.evaluate(probe));
        if (act) {
            // Durable intent precedes dispatch. Process death here keeps uncertainty, never an instruction to retry.
            report.status = 'dispatching-unknown';
            checkpoint();
            await require('./action.cjs').executeWeb({ assertForeground: () => host.assertBound(), ensureWebview: async () => host, client: host }, action);
            report.status = 'dispatch-acknowledged';
            checkpoint();
        }
        artifact('dom.json', await host.evaluate(require('./dom.cjs').expression(scope)));
        artifact('css.json', await host.evaluate(require('./css.cjs').expression(scope)));
        if (probe)
            artifact('state-after.json', await host.evaluate(probe));
        const shot = await host.send('Page.captureScreenshot', { format: 'png' });
        artifact('screenshot.png', Buffer.from(shot.data, 'base64'), true);
        artifact('events.json', host.capture.snapshot());
        report.status = act ? 'dispatch-acknowledged' : 'observed';
        checkpoint();
        return report;
    }
    catch (e) {
        report.failure = { code: ['PC_DOCUMENT_CHANGED', 'WEB_ACTION_REJECTED', 'ETIMEDOUT', 'CDP_CONNECTION_CLOSED'].includes(e?.code) ? e.code : 'PC_CAPTURE_FAILED', cause: 'See current target and original action evidence; no automatic retry' };
        if (!act)
            report.status = 'failed';
        checkpoint();
        throw e;
    }
    finally {
        host?.close();
    }
}
const pcSession = { record, pages, bind, start, capture };
module.exports = pcSession;
