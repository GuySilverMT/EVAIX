import { AstTransformer } from '../src/ingest/AstTransformer.js';
import assert from 'node:assert';

async function runTests() {
  const transformer = new AstTransformer();
  const code = `<div className="p-4 bg-red-500"><Button>Hello</Button></div>`;

  console.log('Testing parse with code:', code);
  const tree = transformer.parse(code);

  // console.log('Tree:', JSON.stringify(tree, null, 2));

  assert.ok(tree.rootId, 'Root ID should exist');
  assert.ok(tree.nodes[tree.rootId], 'Root node should exist in map');

  const root = tree.nodes[tree.rootId];
  console.log('Root node type:', root.type);

  // Since our wrapper <>{code}</> has one child (the div), our visit logic should return the div directly.
  assert.strictEqual(root.type, 'div');
  assert.strictEqual(root.style.padding, 'p-4');
  assert.strictEqual(root.style.background, 'bg-red-500');

  assert.strictEqual(root.children.length, 1, 'Should have 1 child (Button)');
  const buttonId = root.children[0];
  const button = tree.nodes[buttonId];

  assert.ok(button, 'Button node should exist');
  assert.strictEqual(button.type, 'Button');

  assert.strictEqual(button.children.length, 1, 'Button should have 1 child (Text)');
  const textId = button.children[0];
  const text = tree.nodes[textId];

  assert.ok(text, 'Text node should exist');
  assert.strictEqual(text.type, 'Text');
  assert.strictEqual(text.props.content, 'Hello');

  console.log('All tests passed!');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
