import { contextManager } from '../src/services/ContextManager.js';

async function run() {
  const roleId = 'smoke-role-1';
  console.log('Setting context...');
  await contextManager.setContext(roleId, { tone: 'helpful', memory: { lastTask: 'smoke-test' } });
  console.log('Context set. Reading back...');
  const ctx1 = await contextManager.getContext(roleId);
  console.log('Context read:', JSON.stringify(ctx1, null, 2));

  console.log('Setting memory key foo=bar');
  await contextManager.setMemoryKey(roleId, 'foo', 'bar');
  const ctx2 = await contextManager.getContext(roleId);
  console.log('Context after key set:', JSON.stringify(ctx2, null, 2));

  console.log('Removing memory key foo');
  await contextManager.removeMemoryKey(roleId, 'foo');
  const ctx3 = await contextManager.getContext(roleId);
  console.log('Context after remove:', JSON.stringify(ctx3, null, 2));

  console.log('Clearing context');
  await contextManager.clearContext(roleId);
  const ctx4 = await contextManager.getContext(roleId);
  console.log('Context after clear (should be defaults):', JSON.stringify(ctx4, null, 2));
}

run().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});
