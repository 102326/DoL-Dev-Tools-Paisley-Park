// Generated from chrome-launch.cts by TypeScript 6.0.2; source-lf-sha256=8e5abc117fe66eac3d0ea3a589b407be9e24d2cdc68fdd9b4a0899873f6250f6
"use strict";
'use strict';
// Owned-browser startup adapted from the MIT ACT4 host, fixed history 52a8893.
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process'), { createHash } = require('node:crypto');
const { targets } = require('./cdp.cjs'), { ChromeHost } = require('./chrome-host.cjs');
const { pcCleanup } = require('./diagnostics.cjs');
const pause = (ms) => new Promise(r => setTimeout(r, ms));
function fail(code) { return Object.assign(Error(code), { code }); }
async function launch(options) {
    if (!options.out || !path.isAbsolute(options.executable || '') || !fs.statSync(options.executable).isFile() || !['visible', 'headless'].includes(options.mode))
        throw fail('PC_LAUNCH_INVALID');
    const url = new URL(options.url);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.hash)
        throw fail('PC_LAUNCH_INVALID');
    const output = path.resolve(options.out);
    fs.mkdirSync(output, { mode: 0o700 });
    let profile = path.join(output, 'browser-profile');
    if (options.resume) {
        const old = options.resume;
        if (old.resourceDigest !== options.resourceDigest && !options.allowResourceUpdate || old.target.origin !== url.origin)
            throw fail('PC_RESUME_IDENTITY_CHANGED');
        try {
            process.kill(old.target.processId, 0);
            throw fail('PC_PROFILE_IN_USE');
        }
        catch (e) {
            if (e?.code !== 'ESRCH')
                throw e;
        }
        let live = false;
        try {
            await targets(old.target.endpoint, 500);
            live = true;
        }
        catch { }
        if (live)
            throw fail('PC_PROFILE_IN_USE');
        profile = fs.realpathSync(old.profilePath);
    }
    else
        fs.mkdirSync(profile, { mode: 0o700 });
    profile = fs.realpathSync(profile);
    const logs = [];
    let browser, host, closed = false;
    function closeLogs() { const errors = []; for (const fd of logs.splice(0))
        try {
            fs.closeSync(fd);
        }
        catch (error) {
            errors.push(error);
        } return errors; }
    async function stop() { if (!browser || closed)
        return; let timer; const end = new Promise(resolve => browser.once('close', resolve)); try {
        browser.kill();
        await Promise.race([end, new Promise(resolve => { timer = setTimeout(resolve, 5000); })]);
        if (!closed)
            throw fail('PC_STOP_UNCONFIRMED');
    }
    finally {
        clearTimeout(timer);
    } }
    let launchFailed = false, failure, started;
    try {
        for (const name of ['chrome-stdout.log', 'chrome-stderr.log'])
            logs.push(fs.openSync(path.join(output, name), 'wx', 0o600));
        browser = spawn(options.executable, [...(options.mode === 'headless' ? ['--headless=new'] : []), '--enable-automation', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, url.href], { windowsHide: options.mode === 'headless', stdio: ['ignore', logs[0], logs[1]] });
        let failed = false;
        browser.on('error', () => { failed = true; });
        browser.once('close', () => { closed = true; });
        fs.writeFileSync(path.join(output, 'launch.json'), JSON.stringify({ processId: browser.pid, profilePath: profile, executable: options.executable, resourceDigest: options.resourceDigest, scope: 'Owned launch; preserve on unconfirmed termination' }), { flag: 'wx', mode: 0o600 });
        const logErrors = closeLogs();
        if (logErrors.length)
            throw pcCleanup(logErrors);
        const active = path.join(profile, 'DevToolsActivePort');
        let endpoint, socket;
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline && !failed && !closed) {
            if (fs.existsSync(active)) {
                const [port, websocket] = fs.readFileSync(active, 'utf8').trim().split(/\r?\n/);
                if (/^\d{1,5}$/.test(port) && Number(port) > 0 && Number(port) <= 65535 && websocket?.startsWith('/devtools/browser/') && websocket !== '/devtools/browser/' + options.resume?.target.browserId) {
                    endpoint = 'http://127.0.0.1:' + port;
                    socket = websocket;
                    break;
                }
            }
            await pause(50);
        }
        if (!endpoint || failed || closed)
            throw fail('PC_LAUNCH_FAILED');
        let pages = [];
        while (Date.now() < deadline && !closed) {
            // Only retry a read-only readiness timeout, within the original launch deadline.
            // No page action, alternate endpoint or existing Session is resumed here.
            try {
                pages = (await targets(endpoint, Math.max(1, Math.min(3000, deadline - Date.now())))).filter(p => p.type === 'page' && p.url === url.href);
            }
            catch (error) {
                const e = error;
                if (e?.code !== 'CDP_DISCOVERY_TIMEOUT' && !(e?.code === 'ETIMEDOUT' && e.cdpStage === 'cdp.discovery') || Date.now() >= deadline)
                    throw error;
            }
            if (pages.length === 1)
                break;
            await pause(50);
        }
        if (pages.length !== 1 || closed)
            throw fail('PC_TARGET_UNAVAILABLE');
        const target = { host: 'chrome', profileId: createHash('sha256').update(profile).digest('hex'), browserId: socket.slice('/devtools/browser/'.length), processId: browser.pid, endpoint, targetId: pages[0].id, origin: url.origin, profilePath: profile };
        host = await new ChromeHost(target).open();
        const record = { format: 'paisley-owned-chrome', version: 1, executable: options.executable, profilePath: profile, mode: options.mode, createdAt: new Date().toISOString(), browserVersion: await host.verifyBrowser(), resourceDigest: options.resourceDigest, ...(options.resume && options.resume.resourceDigest !== options.resourceDigest ? { previousResourceDigest: options.resume.resourceDigest, resourceUpdateReviewed: true } : {}), target: { ...target, document: host.binding } };
        if (closed || failed)
            throw fail('PC_LAUNCH_FAILED');
        const hostFile = path.join(output, 'host.json');
        fs.writeFileSync(hostFile, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
        started = { record, hostFile, browser, isClosed: () => closed, stop };
    }
    catch (error) {
        launchFailed = true;
        failure = error;
    }
    const cleanup = closeLogs();
    try {
        host?.close();
    }
    catch (error) {
        cleanup.push(error);
    }
    if (launchFailed || cleanup.length) {
        try {
            await stop();
        }
        catch (error) {
            cleanup.push(error);
        }
        if (cleanup.length)
            throw pcCleanup([...(launchFailed ? [failure] : []), ...cleanup]);
        throw failure;
    }
    return started;
}
const launcher = { launch };
module.exports = launcher;
