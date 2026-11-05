declare namespace privacy {type Redacted=null|boolean|number|string|Redacted[]|{[key:string]:Redacted}}
const {createHash}:typeof import('node:crypto')=require('node:crypto');
function text(value:unknown, limit = 128):string|null {
  if (typeof value !== 'string') return null;
  return value.slice(0, limit)
    .replace(/(?:[A-Za-z]:[\\/]|\/(?:data|storage|sdcard|home|Users)\/)[^\s"<>]*/g, '[private-path]')
    .replace(/(?:https?|file):\/\/[^\s"<>]*/gi, '[url]')
    .replace(/\b(?:Bearer\s+\S+|(?:token|password|cookie|authorization|credential|secret)\s*[:=]\s*\S+)/gi, '[credential]');
}
function redact(value:unknown, depth = 0):privacy.Redacted {
  if (depth > 16) return '[depth-limit]';
  if (typeof value === 'string') return text(value, 256);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.slice(0, 1000).map(item => redact(item, depth + 1));
  if (typeof value !== 'object') return null;
  const result:Record<string,privacy.Redacted> = Object.create(null);
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    if (/(?:token|password|cookie|authorization|credential|secret|savebody|characterdata|inputvalue|requestbody|responsebody)/i.test(key)) continue;
    result[text(key, 64)!] = redact(item, depth + 1);
  }
  return result;
}
function networkAddress(value:unknown) {
  try {
    const url = new URL(value as string);
    return { scheme: ['http:', 'https:'].includes(url.protocol) ? url.protocol : 'other',
      hostHash: createHash('sha256').update(url.hostname).digest('hex').slice(0, 16), path: '[omitted]' };
  } catch { return { scheme: 'unknown', path: '[omitted]' }; }
}
const privacy={text,redact,networkAddress};
export = privacy;
