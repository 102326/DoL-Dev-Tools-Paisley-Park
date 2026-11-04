'use strict';
// Experiment only. Explicitly select an existing tab in an ACT4-owned browser.
// New document binding never settles a previous GER effect or changes its Store.
async function bindOwned(history,record,{targetId,url}) {
 const {targets}=require(history+'/scripts/lib/cdp.cjs');
 const {ChromeHost}=require(history+'/scripts/lib/chrome-host.cjs');
 const fs=require('node:fs'),crypto=require('node:crypto');
 if(record.format!=='paisley-owned-chrome'||record.version!==1||record.target.profilePath!==fs.realpathSync(record.profilePath)||record.target.profileId!==crypto.createHash('sha256').update(fs.realpathSync(record.profilePath)).digest('hex'))throw Error('Owned launch record required');
 const wanted=new URL(url);
 if(wanted.origin!==record.target.origin||wanted.protocol!=='http:'||wanted.hostname!=='127.0.0.1'||wanted.username||wanted.password)throw Error('Reviewed owned HTTP origin required');
 const pages=(await targets(record.target.endpoint)).filter(p=>p.type==='page'&&p.url===wanted.href&&(!targetId||p.id===targetId));
 if(pages.length!==1)throw Error('Explicit unique target required; candidates='+pages.length);
 const target={...record.target,targetId:pages[0].id};delete target.document;
 const host=await new ChromeHost(target).open();
 try{if(host.binding.url!==wanted.href)throw Error('Requested URL changed during binding');return {host,record:{...record,target:{...target,document:host.binding}}}}catch(e){host.close();throw e}
}
module.exports={bindOwned};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 (async()=>{const [history,input,targetId,url,out]=process.argv.slice(2);if(!history||!input||!targetId||!url||!out)throw Error('Usage: bind-owned.cjs HISTORY_ROOT OWNED_HOST_JSON TARGET_ID EXACT_URL NEW_HOST_JSON');
 const result=await bindOwned(path.resolve(history),JSON.parse(fs.readFileSync(input,'utf8')),{targetId,url});
 try{fs.writeFileSync(out,JSON.stringify(result.record,null,2),{flag:'wx'});console.log(JSON.stringify({hostFile:path.resolve(out),freshDocument:true,oldEffectsSettled:false}))}finally{result.host.close()}
 })().catch(e=>{console.error(e.message);process.exitCode=1});
}
