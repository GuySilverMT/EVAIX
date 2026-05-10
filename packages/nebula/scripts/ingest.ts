
import { AstTransformer } from '../src/ingest/AstTransformer.js';
import fs from 'fs';
import path from 'path';

// Get file from arguments
const relativePath = process.argv[2];

if (!relativePath) {
  console.log("Usage: npx tsx packages/nebula/scripts/ingest.ts <path-to-tsx-file>");
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), relativePath);

if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
}

console.log(`\x1b[36m➤ Ingesting: ${relativePath}\x1b[0m`);

// Read & Parse
const code = fs.readFileSync(absolutePath, 'utf-8');
const transformer = new AstTransformer();
const tree = transformer.parse(code);

// Report
console.log(`\n\x1b[32m✔ Success!\x1b[0m Parsed into NebulaTree (v${tree.version})`);
console.log(`  Nodes:   ${Object.keys(tree.nodes).length}`);
console.log(`  Root ID: ${tree.rootId}`);

console.log(`\n\x1b[33m➤ Imports Found (${tree.imports?.length || 0}):\x1b[0m`);
tree.imports?.forEach(imp => console.log(`  - ${imp}`));

console.log(`\n\x1b[33m➤ Exports Found (${tree.exports?.length || 0}):\x1b[0m`);
tree.exports?.forEach(exp => console.log(`  - ${exp}`));

// Optional: Save raw JSON
// const jsonPath = absolutePath + '.json';
// fs.writeFileSync(jsonPath, JSON.stringify(tree, null, 2));
// console.log(`\nSaved debug JSON to: ${jsonPath}`);
