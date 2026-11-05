// Generated from chrome-host.cts by TypeScript 6.0.2; source-lf-sha256=e076dfd600079916b7807e645997a7ac69762b52d6b72fe6d922d6c6d0f44900
"use strict";
const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
function mainFrame(value) {
    if (!object(value) || !object(value.frameTree) || !object(value.frameTree.frame))
        throw failure('PC_DOCUMENT_CHANGED');
    const frame = value.frameTree.frame;
    if (!['id', 'loaderId', 'url'].every(key => typeof frame[key] === 'string'))
        throw failure('PC_DOCUMENT_CHANGED');
    return frame;
}
'use strict';
const { connect, targets } = require('./cdp.cjs');
const { target: validateTarget } = require('./runtime-target.cjs');
const { events } = require('./collectors.cjs');
const { documentURL } = require('./execution-context.cjs');
const { randomUUID } = require('node:crypto');
const failure = (code) => Object.assign(Error(code), { code });
// M1 supports an explicitly owned Chrome and one immutable document. No title
// selection, automatic retarget, navigation adoption or dispatched-action retry.
class ChromeHost {
    constructor(target, { timeoutMs = 5000, binding = null, assertActive = () => { } } = {}) {
        this.target = validateTarget(target);
        binding ??= target.document ?? null;
        if (target.host !== 'chrome' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000)
            throw Error('Chrome host identity required');
        if (binding && (!['frameId', 'loaderId', 'url', 'uniqueContextId'].every(k => typeof binding[k] === 'string' && binding[k].length > 0) || Object.keys(binding).length !== 4 || new URL(binding.url).origin !== target.origin))
            throw Error('Invalid immutable Chrome document');
        if (typeof assertActive !== 'function')
            throw Error('Invalid lifecycle guard');
        this.assertActive = assertActive;
        this.timeoutMs = timeoutMs;
        this.capture = events();
        this.contexts = new Map();
        this.client = null;
        this.binding = binding ? Object.freeze({ ...binding }) : null;
        this.objects = new Map();
        this.releasedObjects = new Set();
        this.groups = new Set();
        this.globalGroup = 'paisley-bound-' + randomUUID();
    }
    async verifyBrowser() {
        let response;
        try {
            process.kill(this.target.processId, 0);
            response = await fetch(new URL('/json/version', this.target.endpoint), { signal: AbortSignal.timeout(this.timeoutMs), redirect: 'error' });
        }
        catch (e) {
            if (e?.name === 'TimeoutError')
                throw Object.assign(failure('ETIMEDOUT'), { cdpStage: 'pc.browser' });
            throw failure('PC_BROWSER_UNAVAILABLE');
        }
        if (!response.ok)
            throw failure('PC_BROWSER_UNAVAILABLE');
        const v = await response.json();
        if (!object(v) || typeof v.Browser !== 'string' || typeof v.webSocketDebuggerUrl !== 'string')
            throw failure('PC_BROWSER_METADATA_INVALID');
        const socket = new URL(v.webSocketDebuggerUrl);
        if (!/^Chrome\//.test(v.Browser) || socket.protocol !== 'ws:' || socket.host !== new URL(this.target.endpoint).host || socket.pathname !== '/devtools/browser/' + this.target.browserId || socket.username || socket.password)
            throw failure('PC_BROWSER_IDENTITY_CHANGED');
        return v.Browser;
    }
    onEvent(method, raw) {
        const params = raw;
        this.capture.onEvent(method, params);
        if (this.binding && (method === 'Runtime.executionContextsCleared' || method === 'Runtime.executionContextDestroyed' && this.contexts.get(params.executionContextId)?.uniqueId === this.binding.uniqueContextId || method === 'Page.navigatedWithinDocument' && params.frameId === this.binding.frameId))
            this.invalid = true;
        if (method === 'Runtime.executionContextCreated') {
            if (!object(params.context))
                throw failure('CDP_INVALID_RESPONSE');
            this.contexts.set(params.context.id, params.context);
        }
        if (method === 'Runtime.executionContextDestroyed')
            this.contexts.delete(params.executionContextId);
        if (method === 'Runtime.executionContextsCleared')
            this.contexts.clear();
    }
    async open() {
        this.assertActive();
        if (this.client)
            throw Error('Close Chrome transport before explicit reconnect');
        if (this.invalid)
            throw Object.assign(Error('Chrome document changed; explicit new contract required'), { code: 'PC_DOCUMENT_CHANGED' });
        await this.verifyBrowser();
        const pages = (await targets(this.target.endpoint, this.timeoutMs)).filter(p => p.type === 'page' && p.id === this.target.targetId);
        if (pages.length !== 1 || new URL(pages[0].url).origin !== this.target.origin)
            throw failure('PC_TARGET_UNAVAILABLE');
        if (typeof pages[0].webSocketDebuggerUrl !== 'string')
            throw Error('Chrome page socket mismatch');
        const pageSocket = new URL(pages[0].webSocketDebuggerUrl);
        if (pageSocket.host !== new URL(this.target.endpoint).host || pageSocket.pathname !== '/devtools/page/' + this.target.targetId)
            throw Error('Chrome page socket mismatch');
        this.contexts.clear();
        const client = await connect(this.target.endpoint, this.timeoutMs, (m, p) => this.onEvent(m, p), this.target.targetId);
        try {
            if (this.target.profilePath) {
                const command = await client.send('Browser.getBrowserCommandLine');
                if (!Array.isArray(command.arguments) || !command.arguments.every((a) => typeof a === 'string') || command.arguments.filter((a) => a.startsWith('--user-data-dir=')).length !== 1 || !command.arguments.includes('--user-data-dir=' + this.target.profilePath))
                    throw failure('PC_BROWSER_IDENTITY_CHANGED');
            }
            await client.send('Page.enable');
            await client.send('Runtime.enable');
            await client.send('Network.enable');
            // /json/list publishes the intended URL while initial navigation still has
            // an empty document. Only wait for this exact target's requested document;
            // never dispatch or switch targets to make readiness pass.
            let frame, contexts, fullURL;
            const until = Date.now() + this.timeoutMs;
            do {
                frame = mainFrame(await client.send('Page.getFrameTree'));
                contexts = [...this.contexts.values()].filter(c => c.auxData?.isDefault === true && c.auxData.frameId === frame.id && c.origin === this.target.origin && typeof c.uniqueId === 'string');
                fullURL = null;
                try {
                    fullURL = await documentURL(frame, client);
                }
                catch (e) {
                    if (this.binding || e?.code !== 'ANDROID_DOCUMENT_URL_UNAVAILABLE')
                        throw e;
                }
                if (fullURL === pages[0].url && contexts.length === 1 && frame.loaderId)
                    break;
                if (this.binding)
                    throw failure('PC_DOCUMENT_CHANGED');
                if (Date.now() >= until)
                    throw Object.assign(failure('PC_DOCUMENT_CHANGED'), { pcDocumentReason: !frame.url ? 'initial-empty-document' : fullURL !== pages[0].url ? 'initial-url-mismatch' :
                            contexts.length !== 1 ? 'initial-context-unavailable' : 'initial-loader-unavailable' });
                await new Promise(resolve => setTimeout(resolve, 50));
            } while (true);
            const binding = { frameId: frame.id, loaderId: frame.loaderId, url: fullURL, uniqueContextId: contexts[0].uniqueId };
            if (this.binding && JSON.stringify(binding) !== JSON.stringify(this.binding))
                throw failure('PC_DOCUMENT_CHANGED');
            try {
                validateTarget({ ...this.target, document: binding });
            }
            catch {
                throw failure('PC_DOCUMENT_CHANGED');
            }
            this.assertActive();
            this.binding = Object.freeze(binding);
            const global = await client.send('Runtime.evaluate', { expression: 'globalThis', uniqueContextId: binding.uniqueContextId, returnByValue: false, objectGroup: this.globalGroup });
            if (global.exceptionDetails || !global.result?.objectId)
                throw failure('PC_DOCUMENT_CHANGED');
            this.globalId = global.result.objectId;
            this.objects.clear();
            this.releasedObjects.clear();
            this.groups.clear();
            this.client = client;
            await this.assertBound();
            return this;
        }
        catch (error) {
            client.close();
            throw error;
        }
    }
    async assertBound() {
        this.assertActive();
        if (!this.client?.isOpen())
            throw failure('CDP_CONNECTION_CLOSED');
        await this.verifyBrowser();
        const tree = await this.client.send('Page.getFrameTree');
        let frame;
        try {
            frame = mainFrame(tree);
        }
        catch (error) {
            this.invalid = true;
            throw error;
        }
        const b = this.binding;
        let fullURL;
        try {
            fullURL = await documentURL(frame, this.client);
        }
        catch (e) {
            if (e?.code === 'ANDROID_DOCUMENT_URL_UNAVAILABLE') {
                this.invalid = true;
                throw failure('PC_DOCUMENT_CHANGED');
            }
            throw e;
        }
        if (this.invalid || frame.id !== b.frameId || frame.loaderId !== b.loaderId || fullURL !== b.url || ![...this.contexts.values()].some(c => c.uniqueId === b.uniqueContextId)) {
            this.invalid = true;
            throw failure('PC_DOCUMENT_CHANGED');
        }
        this.assertActive();
    }
    async evaluate(expression) {
        await this.assertBound();
        // uniqueContextId prevents a same-number new context executing a stale action
        // if a navigation happens after assertBound. Business guards remain local code.
        const response = await this.client.send('Runtime.evaluate', { expression: this.expression(expression), uniqueContextId: this.binding.uniqueContextId, awaitPromise: true, returnByValue: true });
        if (response.exceptionDetails)
            throw Error('Chrome evaluation failed');
        await this.assertBound();
        return response.result?.value;
    }
    async send(method, params = {}, settings) {
        if (!['Page.captureScreenshot', 'Runtime.evaluate', 'Runtime.callFunctionOn', 'Runtime.getProperties', 'DOM.scrollIntoViewIfNeeded', 'Runtime.releaseObjectGroup', 'Runtime.releaseObject', 'Performance.enable', 'Performance.getMetrics', 'Performance.disable', 'Memory.getDOMCounters', 'Browser.getVersion'].includes(method))
            throw Error('Unsupported bound Chrome operation');
        await this.assertBound();
        if (method === 'Runtime.releaseObject' && this.releasedObjects.has(params.objectId))
            return {};
        if (method === 'Runtime.evaluate') {
            if (params.contextId !== undefined || params.uniqueContextId !== undefined && params.uniqueContextId !== this.binding.uniqueContextId)
                throw Error('Wrong Chrome context');
            params = { ...params, expression: this.expression(params.expression), uniqueContextId: this.binding.uniqueContextId };
        }
        if (['Runtime.callFunctionOn', 'Runtime.getProperties', 'DOM.scrollIntoViewIfNeeded', 'Runtime.releaseObject'].includes(method)) {
            if (!this.objects.has(params.objectId) || params.executionContextId !== undefined || params.uniqueContextId !== undefined || params.nodeId !== undefined || params.backendNodeId !== undefined)
                throw Error('Bound Chrome object required');
        }
        if (method === 'Runtime.callFunctionOn') {
            if (typeof params.functionDeclaration !== 'string' || (params.arguments || []).some(a => a.objectId !== undefined && !this.objects.has(a.objectId)))
                throw Error('Bound Chrome arguments required');
            params = { ...params, functionDeclaration: `function(...boundArgs){const boundGlobal=boundArgs.pop();if(globalThis!==boundGlobal||location.href!==${JSON.stringify(this.binding.url)})throw Error('Bound document changed');return Reflect.apply((${params.functionDeclaration}),this,boundArgs)}`,
                arguments: [...(params.arguments || []), { objectId: this.globalId }] };
        }
        if (['Runtime.evaluate', 'Runtime.callFunctionOn'].includes(method) && typeof params.objectGroup === 'string' && params.objectGroup !== this.globalGroup)
            this.groups.add(params.objectGroup);
        if (method === 'Runtime.releaseObjectGroup' && !this.groups.has(params.objectGroup))
            throw Error('Invalid object group');
        const result = await this.client.send(method, params, settings);
        await this.assertBound();
        const group = params.objectGroup ?? this.objects.get(params.objectId);
        const remember = (value) => { const remote = value; if (remote?.objectId)
            this.objects.set(remote.objectId, group); };
        if (method === 'Runtime.getProperties') {
            for (const p of [...(result.result || []), ...(result.internalProperties || []), ...(result.privateProperties || [])])
                for (const k of ['value', 'get', 'set'])
                    remember(p[k]);
        }
        else
            remember(result.result);
        if (method === 'Runtime.releaseObject') {
            this.objects.delete(params.objectId);
            this.releasedObjects.add(params.objectId);
        }
        if (method === 'Runtime.releaseObjectGroup')
            for (const [id, g] of this.objects)
                if (g === params.objectGroup) {
                    this.objects.delete(id);
                    this.releasedObjects.add(id);
                }
        return result;
    }
    expression(source) { return `(()=>{if(location.href!==${JSON.stringify(this.binding.url)})throw Error('Bound URL changed');return (${source});})()`; }
    close() { this.client?.close(); this.client = null; this.objects.clear(); this.releasedObjects.clear(); this.groups.clear(); this.globalId = null; }
}
const api = { ChromeHost };
module.exports = api;
