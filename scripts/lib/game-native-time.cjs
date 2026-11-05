// Generated from game-native-time.cts by TypeScript 6.0.2; source-lf-sha256=a173be88370730a6077911c5100f60534f0a312c484c0479196147fb2cdaa60d
"use strict";
'use strict';
const { createHash } = require('node:crypto');
const { captured, member, sameObject } = require('./game-contract.cjs');
const profile = require('./game-native-time-profile.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');
// A synchronous minute envelope, not a time-hook sandbox. The same
// navigation operation owns installation/restoration of these observers.
const { createMonitor } = require('./browser-abi/native-time.cjs');
async function bind(client, held, { minutes = 1, allowHourCrossing = false } = {}) {
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 59 || typeof allowHourCrossing !== 'boolean')
        throw Error('Invalid native minute duration');
    const group = held.objectGroup;
    const get = async (expression) => {
        const r = await client.send('Runtime.evaluate', { expression, objectGroup: group, returnByValue: false, silent: true });
        if (r.exceptionDetails || !r.result?.objectId)
            throw Error('Native time binding unavailable');
        return r.result.objectId;
    };
    const handler = await get('window.SugarCube.Macro.get("pass").handler');
    const passTime = await captured(client, handler, 'passTime');
    const proxyPass = await get('Time.pass'), pass = await captured(client, proxyPass, 'value'), target = await captured(client, proxyPass, 'target', 'object');
    const oldPass = await get('window.modSC2DataManager.sc2EventTracer.callback[0].addonPluginTable.find(r=>r.modName==="DoLTimeWrapperAddon").hookPoint.timeWrapperAddon._timeHookManager.oldTimeFunctionRef.passTime');
    const lexicalTime = await captured(client, oldPass, 'Time', 'object');
    if (!await sameObject(client, target, lexicalTime))
        throw Error('Original passTime uses a different Time target');
    const tail = [];
    for (const name of ['secondPassed', 'minutePassed', 'set', 'setDate'])
        tail.push(await captured(client, pass, name));
    const hour = allowHourCrossing ? await captured(client, pass, 'hourPassed') : null;
    const hourStats = allowHourCrossing ? await captured(client, await get('window.modSC2DataManager.sc2EventTracer.callback[0].addonPluginTable.find(r=>r.modName==="DoLTimeWrapperAddon").hookPoint.timeWrapperAddon._timeHookManager.oldTimeFunctionRef.hourPassed'), 'statChange', 'object', { maxResponseBytes: 16 * 1024 * 1024 }) : null;
    const capture = await client.send('Runtime.callFunctionOn', { objectId: target, objectGroup: group, returnByValue: false,
        arguments: [...([handler, passTime, pass, ...tail, oldPass, lexicalTime].map(objectId => ({ objectId }))), hour ? { objectId: hour } : { value: null }, hourStats ? { objectId: hourStats } : { value: null }], functionDeclaration: `function(handler,passTime,pass,secondPassed,minutePassed,set,setDate,oldPass,lexicalTime,hourPassed,hourStats){
      const hits=window.modSC2DataManager.sc2EventTracer.callback[0].addonPluginTable.filter(r=>r.modName==='DoLTimeWrapperAddon');
      if(hits.length!==1)throw Error('Native time Addon unavailable');
      const addon=hits[0].hookPoint.timeWrapperAddon,hook=addon._timeHookManager,proxy=addon._timeProxyManager,old=hook.oldTimeFunctionRef;
      if(old.passTime!==oldPass||lexicalTime!==this||lexicalTime.pass!==pass)throw Error('Original passTime binding differs');
      const sources=[],source=(name,value)=>{if(typeof value!=='function')throw Error('Native time function unavailable');
        const text=Function.prototype.toString.call(value);if(text.length>32768)throw Error('Native time function bound');
        sources.push(Object.freeze({name,value,source:text}));};
      for(const [name,value] of [['pass.handler',handler],['passTime',passTime],['Time.pass.proxy',Time.pass],['Time.pass.original',pass],
        ['secondPassed',secondPassed],['minutePassed.wrapper',minutePassed],['set',set],['setDate',setDate],
        ['old.passTime',old.passTime],['old.minutePassed',old.minutePassed],['hook.invoke',hook.invokeOldTimeFunctionRef],
        ['hook.safe',hook.runCallbackSafe],['hook.callback',hook.runCallback],['proxy.callback',proxy.runCallback]])source(name,value);
      if(hourPassed!==null){source('hourPassed.wrapper',hourPassed);source('old.hourPassed',old.hourPassed);}
      const hourBindings=hourStats===null?[]:['control','arousal'].map(name=>Object.freeze({name,value:hourStats[name]}));
      for(const r of hourBindings)source('hour.'+r.name,r.value);
      const managers=[hook,proxy].map(owner=>Object.freeze({owner,hooks:owner.callableHook,original:owner.runCallback}));
      return Object.freeze({hook,proxy,old,oldPass,oldMinute:old.minutePassed,oldHour:old.hourPassed,hourStats,hourBindings:Object.freeze(hourBindings),handler,pass,target:this,lexicalTime,
        safe:hook.runCallbackSafe,invoke:hook.invokeOldTimeFunctionRef,sources:Object.freeze(sources),managers:Object.freeze(managers),
        clock:()=>({hour:Time.hour,minute:Time.minute,second:Time.second})});
    }` });
    if (capture.exceptionDetails || !capture.result?.objectId)
        throw Error('Native time envelope unavailable');
    const proxyTarget = await member(client, capture.result.objectId, 'this.proxy.originTime', group);
    if (!await sameObject(client, target, proxyTarget))
        throw Error('Native Time target differs');
    const result = await client.send('Runtime.callFunctionOn', { objectId: capture.result.objectId, objectGroup: group, returnByValue: false, functionDeclaration: createMonitor.toString(), arguments: [{ value: minutes }, { value: allowHourCrossing }] });
    if (result.exceptionDetails || !result.result?.objectId)
        throw Error('Native time monitor unavailable');
    const objectId = result.result.objectId;
    const metadata = await client.send('Runtime.callFunctionOn', { objectId, returnByValue: true, functionDeclaration: 'function(){return this.metadata()}' });
    const rows = metadata.result?.value;
    if (metadata.exceptionDetails || !Array.isArray(rows) || JSON.stringify(rows.map((r) => ({ name: r.name, sha256: sha(r.source) }))) !== JSON.stringify([...profile.functions, ...(allowHourCrossing ? profile.hourFunctions : [])]))
        throw Error('Native time source differs from reviewed profile');
    const checked = await client.send('Runtime.callFunctionOn', { objectId, returnByValue: true, functionDeclaration: 'function(){return this.preflight()??null}' });
    if (checked.exceptionDetails || checked.result?.value !== null)
        throw Error('Native time preflight unavailable');
    return { objectId, digest: sha(createMonitor.toString() + JSON.stringify(profile) + JSON.stringify({ minutes, allowHourCrossing })) };
}
module.exports = { bind, createMonitor };
