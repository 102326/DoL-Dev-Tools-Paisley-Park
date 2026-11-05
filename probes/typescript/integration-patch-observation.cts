function probe() {
  const bridge = (window as unknown as {WhiteSnakePatchProbe?:{read?:()=>unknown}}).WhiteSnakePatchProbe;
  if (typeof bridge?.read !== 'function') return {status: 'unavailable'};
  const record = bridge.read() as {schemaVersion?:unknown;document?:{timeOrigin?:unknown;nonce?:unknown};observation?:{schemaVersion?:unknown;identity?:{documentId?:unknown};events?:unknown}|null};
  if (record?.schemaVersion !== 1 || !Number.isFinite(record.document?.timeOrigin) ||
      typeof record.document?.nonce !== 'string' || !record.document.nonce ||
      record.document.timeOrigin !== performance.timeOrigin) return {status: 'unsupported', reason: 'capture-document-mismatch'};
  const observation = record.observation;
  if (observation !== null && (observation?.schemaVersion !== 1 ||
      observation.identity?.documentId !== record.document.nonce ||
      !Array.isArray(observation.events) || observation.events.length > 16)) return {status: 'unsupported', reason: 'capture-contract-mismatch'};
  // A current-document record is not cross-evaluate binding or a business success claim.
  return {status: 'available', source: 'reviewed optional startup observation', record};
}
export = {probe};
