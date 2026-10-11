// Add protocol identity to existing business fixtures; business handlers stay unchanged.
module.exports = (client, onEvent) => {
  const send = client.send;
  client.send = async (method, params, settings) => {
    if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'fixture', loaderId: 'fixture-loader', url: 'https://fixture.invalid/' } } };
    if (method === 'Runtime.enable') {
      onEvent('Runtime.executionContextCreated', { context: { id: 1, uniqueId: 'fixture-context', auxData: { isDefault: true, frameId: 'fixture' } } });
      return {};
    }
    if (method === 'Runtime.evaluate' && params.returnByValue && client.evaluate) return { result: { value: await client.evaluate(params.expression) } };
    return send.call(client, method, params, settings);
  };
  return client;
};
