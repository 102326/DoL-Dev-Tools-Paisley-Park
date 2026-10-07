'use strict';
const {DatabaseSync}=require('node:sqlite');
class Receiver{
  constructor(file,{location='Bedroom',money=100}={}){
    this.db=new DatabaseSync(file);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=1000;');
    this.db.exec('CREATE TABLE IF NOT EXISTS world(id INTEGER PRIMARY KEY,location TEXT,money INTEGER,count INTEGER,revision INTEGER); CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,doc TEXT);');
    this.db.prepare('INSERT OR IGNORE INTO world VALUES(1,?,?,0,0)').run(location,money);
  }
  close(){this.db.close()}
  tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value}catch(e){this.db.exec('ROLLBACK');throw e}}
  choices(location){return ({Bedroom:[['go-street','navigation',0,'Street']],Street:[['go-shop','navigation',0,'Shop']],Shop:[['buy-cap','buy',40,'Shop'],['go-home','navigation',0,'Home']],Home:[]}[location]||[]).map(([ref,kind,cost,destination])=>({ref,kind,cost,destination,risk:'normal'}))}
  observe(){const w=this.db.prepare('SELECT * FROM world WHERE id=1').get();return {source:'isolated fixture receiver',revision:w.revision,location:w.location,choices:this.choices(w.location)}}
  row(id){const r=this.db.prepare('SELECT doc FROM requests WHERE id=?').get(id);return r?JSON.parse(r.doc):null}
  put(r){this.db.prepare('INSERT INTO requests VALUES(?,?) ON CONFLICT(id) DO UPDATE SET doc=excluded.doc').run(r.id,JSON.stringify(r))}
  apply(r){
    const w=this.db.prepare('SELECT * FROM world WHERE id=1').get();
    if(w.money<r.action.cost){r.status='not-occurred';r.spent=0;this.put(r);return}
    this.db.prepare('UPDATE world SET location=?,money=money-?,count=count+?,revision=revision+1 WHERE id=1').run(r.action.destination,r.action.cost,r.action.kind==='buy'?1:0);
    r.status='occurred';r.spent=r.action.cost;this.put(r);
  }
  dispatch(e,{delay=false}={}){return this.tx(()=>{
    const prior=this.row(e.id);if(prior){prior.calls++;this.put(prior);return {dispatch:'unknown',reason:'duplicate non-idempotent invocation detected'}}
    const w=this.observe(),current=w.choices.find(a=>a.ref===e.action.ref);
    const r={id:e.id,status:'inflight',action:e.action,calls:1,spent:0};
    if(w.revision!==e.sceneRevision||!current||JSON.stringify(current)!==JSON.stringify(e.action)){r.status='not-occurred';this.put(r);return {dispatch:'not-dispatched',reason:'original receiver precondition changed'}}
    this.put(r);if(!delay)this.apply(r);return {dispatch:'acknowledged'};
  })}
  complete(id){return this.tx(()=>{const r=this.row(id);if(r?.status!=='inflight')throw Error('No pending remote request');this.apply(r)})}
  cancelRemote(id){return this.tx(()=>{const r=this.row(id);if(r?.status!=='inflight')throw Error('No pending remote request');r.status='not-occurred';this.put(r)})}
  receipts(effects){return effects.map(e=>{const r=this.row(e.id);return {attemptId:e.id,outcome:r?.status==='occurred'?'occurred':r?.status==='not-occurred'?'not-occurred':'unknown',remoteClosed:!!r&&r.status!=='inflight',spent:r?.spent||0,source:'fixture receiver terminal per-attempt history'}})}
  original(){return this.db.prepare('SELECT * FROM world WHERE id=1').get()}
  calls(){return this.db.prepare('SELECT doc FROM requests').all().map(r=>JSON.parse(r.doc)).reduce((n,r)=>n+r.calls,0)}
}
const text=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const strict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const provider={
  validateGoal:g=>strict(g,['description','location'])&&text(g.location),
  scene(v){
    if(!strict(v,['source','revision','location','choices'])||!text(v.source)||!integer(v.revision)||!text(v.location)||!Array.isArray(v.choices)||v.choices.length>32)throw Error('Invalid fixture scene');
    const seen=new Set();for(const a of v.choices){if(!strict(a,['ref','kind','cost','risk','destination'])||!text(a.ref)||seen.has(a.ref)||!['navigation','buy','menu'].includes(a.kind)||!integer(a.cost)||a.risk!=='normal'||!text(a.destination))throw Error('Unreviewed action');seen.add(a.ref)}return JSON.parse(JSON.stringify(v));
  },
  satisfied:(v,g)=>v.location===g.location,
};
module.exports={Receiver,provider};
