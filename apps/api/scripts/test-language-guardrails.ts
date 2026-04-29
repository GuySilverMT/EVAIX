#!/usr/bin/env tsx
/**
 * Test Script: Language Guardrails Verification
 * 
 * Tests the language detection and rejection logic in CodeModeStrategy
 */

import { CodeModeStrategy } from '../src/services/tooling/ExecutionStrategies.js';

interface TestCase {
  name: string;
  input: string;
  shouldReject: boolean;
  expectedViolation?: string;
}

const testCases: TestCase[] = [
  // Python Code Tests
  {
    name: "Python import statement",
    input: "import os\nprint(os.listdir('.'))",
    shouldReject: true,
    expectedViolation: "Python code detected"
  },
  {
    name: "Python function definition",
    input: "def my_function():\n    return 'hello'",
    shouldReject: true,
    expectedViolation: "Python code detected"
  },
  {
    name: "Python in code block",
    input: "```python\nimport sys\nprint(sys.version)\n```",
    shouldReject: true,
    expectedViolation: "Python code detected"
  },
  {
    name: "pip install command",
    input: "pip install requests",
    shouldReject: true,
    expectedViolation: "Python code detected"
  },
  
  // Thought Log Tests
  {
    name: "Thought log pattern",
    input: "Thought: I need to read the file\nAction: Read file",
    shouldReject: true,
    expectedViolation: "Manual thought logs detected"
  },
  {
    name: "Observation pattern",
    input: "Observation: The file contains data",
    shouldReject: true,
    expectedViolation: "Manual thought logs detected"
  },
  
  // Valid TypeScript Tests
  {
    name: "Valid TypeScript async/await",
    input: "const data = await system.read_file({ path: 'test.txt' });\nconsole.log(data);",
    shouldReject: false
  },
  {
    name: "Valid TypeScript in code block",
    input: "```typescript\nconst result = await system.terminal_execute({ command: 'ls' });\n```",
    shouldReject: false
  },
  {
    name: "Valid JavaScript",
    input: "```javascript\nconst files = await system.list_files({ path: '.' });\nconsole.log(files);\n```",
    shouldReject: false
  },
  {
    name: "TypeScript with imports",
    input: "import { readFile } from 'fs/promises';\nconst data = await readFile('test.txt', 'utf-8');",
    shouldReject: false
  },
  
  // Edge Cases
  {
    name: "Python mentioned in comment",
    input: "// This is how you would do it in Python: import os\nconst files = await system.list_files({ path: '.' });",
    shouldReject: true, // Conservative: reject even in comments
    expectedViolation: "Python code detected"
  },
  {
    name: "Print in TypeScript context",
    input: "console.log('print this message');", // 'print' is in a string
    shouldReject: false
  }
];

async function runTests() {
  console.log('🧪 Language Guardrails Test Suite\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      // Access the private method via reflection (for testing purposes)
      const strategy = new CodeModeStrategy(null as any);
      const detectMethod = (strategy as any).detectLanguageViolation.bind(strategy);
      
      const violation = detectMethod(testCase.input);
      const wasRejected = violation !== null;
      
      const testPassed = wasRejected === testCase.shouldReject;
      
      if (testPassed) {
        console.log(`✅ PASS: ${testCase.name}`);
        if (wasRejected) {
          console.log(`   Violation: ${violation}`);
        }
        passed++;
      } else {
        console.log(`❌ FAIL: ${testCase.name}`);
        console.log(`   Expected: ${testCase.shouldReject ? 'REJECT' : 'ALLOW'}`);
        console.log(`   Got: ${wasRejected ? 'REJECT' : 'ALLOW'}`);
        if (violation) {
          console.log(`   Violation: ${violation}`);
        }
        failed++;
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ ERROR: ${testCase.name}`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
      failed++;
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\nResults: ${passed} passed, ${failed} failed (${testCases.length} total)\n`);
  
  if (failed === 0) {
    console.log('✅ All tests passed!\n');
    return 0;
  } else {
    console.log('❌ Some tests failed. Review the output above.\n');
    return 1;
  }
}

// Run tests
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
