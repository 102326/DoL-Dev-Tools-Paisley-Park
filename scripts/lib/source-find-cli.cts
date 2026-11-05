import type * as finder from './source-find.cjs';
interface Options {root?:unknown;file?:unknown;out?:unknown;revision?:unknown;[key:string]:unknown}
// CLI I/O only. The typed finder owns request normalization, search and source identity.
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {randomUUID}:typeof import('node:crypto')=require('node:crypto');
const {owned}:typeof import('./owned-files.cjs')=require('./owned-files.cjs');
const coded = (code:string) => Object.assign(Error(code), {code});
function readQuery(file:string):unknown {
  let fd;
  try {
    fd = fs.openSync(file,fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 65536) throw 0;
    const bytes = Buffer.alloc(65537);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(fd,bytes,length,bytes.length-length,length);
      if (!count) break;
      length += count;
    }
    if (length > 65536) throw 0;
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length)));
  } catch { throw coded('SOURCE_QUERY_INVALID'); }
  finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch { throw coded('SOURCE_QUERY_INVALID'); } } }
}
function publish(out:string, result:finder.Result, request:finder.Request) {
  const bytes = Buffer.from(JSON.stringify({schemaVersion:1,incidentId:randomUUID(),capturedAt:new Date().toISOString(),
    source:'local source candidates; heuristic matches, not loaded runtime proof',
    selection:{root:request.root,revision:request.revision??null,limits:request.limits},data:result},null,2));
  if (bytes.length > 2*1024*1024) throw coded('SOURCE_OUTPUT_TOO_LARGE');
  const staging = owned(); let stage:string|undefined, recorded = false, publicationAttempted = false;
  try {
    stage = fs.mkdtempSync(path.join(path.dirname(out),'.paisley-source-find-'));
    staging.adopt(stage); recorded = true;
    const file = path.join(stage,'result.json');
    staging.write(file,bytes);
    if (!fs.readFileSync(file).equals(bytes)) throw coded('SOURCE_OUTPUT_FAILED');
    // Same-parent exclusive link publishes complete bytes without replacing a peer output.
    publicationAttempted = true;
    fs.linkSync(file,out);
    return {cleanup:staging.cleanup()?'completed':'retained-unknown'};
  } catch (error) {
    let publicationUnknown = false;
    if (publicationAttempted && (error as {code?:unknown}|null|undefined)?.code !== 'EEXIST') {
      try { fs.lstatSync(out); publicationUnknown = true; }
      catch (check) { if ((check as {code?:unknown}|null|undefined)?.code !== 'ENOENT') publicationUnknown = true; }
    }
    const cleaned = (!stage || recorded) && staging.cleanup();
    if (cleaned && !publicationUnknown) {
      if ((error as {code?:unknown}|null|undefined)?.code === 'EEXIST') throw coded('SOURCE_OUTPUT_EXISTS');
      throw coded('SOURCE_OUTPUT_FAILED');
    }
    throw coded('SOURCE_OUTPUT_INCOMPLETE');
  }
}
async function run(options:Options) {
  if (!options || !['root','file','out'].every(k=>typeof options[k]==='string'&&(options[k] as string).trim())) throw coded('SOURCE_REQUEST_INVALID');
  if (Number(process.versions.node.split('.')[0]) < 26) throw coded('SOURCE_RUNTIME_UNAVAILABLE');
  let engine:typeof import('./source-find.cjs');
  try { engine = require('./source-find.cjs'); }
  catch (error) {
    if (['MODULE_NOT_FOUND','ERR_MODULE_NOT_FOUND','ERR_UNKNOWN_FILE_EXTENSION','ERR_REQUIRE_ESM'].includes((error as {code?:unknown}|null|undefined)?.code as string)) throw coded('SOURCE_RUNTIME_UNAVAILABLE');
    throw error; // Unknown module failures are not invented prerequisite diagnoses.
  }
  const query = readQuery(options.file as string);
  if (!query || typeof query!=='object' || Array.isArray(query) || Object.keys(query).some(k=>!['schemaVersion','clues','limits'].includes(k))) throw coded('SOURCE_REQUEST_INVALID');
  const request = engine.parseRequest({...query,root:options.root,...(options.revision===undefined?{}:{revision:options.revision})});
  const out = path.resolve(options.out as string);
  try { fs.lstatSync(out); throw coded('SOURCE_OUTPUT_EXISTS'); }
  catch (error) {
    if ((error as {code?:unknown}|null|undefined)?.code==='SOURCE_OUTPUT_EXISTS') throw error;
    if ((error as {code?:unknown}|null|undefined)?.code!=='ENOENT') throw coded('SOURCE_OUTPUT_FAILED');
  }
  const result = await engine.findSource(request);
  return {result,...publish(out,result,request)};
}
const api={run};
export = api;
