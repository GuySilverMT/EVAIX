// eslint.config.mjs
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. GLOBAL IGNORES
  // Must be the first object with only an 'ignores' key
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/coverage',
      '**/.next',
      '**/*.d.ts', // Explicitly ignore declaration files
      '**/src/**/*.js', // Ignore transpiled .js files in src directories
    ],
  },

  // 2. JAVASCRIPT & CONFIG FILES (No Type Checking)
  // Solves "Parsing error" and "CommonJS globals"
  {
    files: [
      '**/*.cjs',
      '**/*.mjs',
      '**/*.config.js',
      'eslint.config.mjs', // This file itself
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module', // Default to module for .mjs, .config.js
      globals: {
        ...globals.node, // Adds require, module, __dirname, process
      },
      parserOptions: {
        project: null, // CRITICAL: Disables TS parser for JS files
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off', // Allow require() in JS files
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.cjs'], // Specific override for .cjs files
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  // 3. TYPESCRIPT FILES (Strict Type Checking)
  {
    files: ['tests/manual/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Add any specific rules for test files here if needed
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['tests/manual/**/*.ts', 'scripts/**/*.ts'],
    // Use the new tseslint utility to combine configs
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'], // Adjust to your monorepo structure
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Downgrade specific rules to warnings as requested
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn', // Allow @ts-ignore with a warning

      // Temporarily downgrade no-unsafe-* rules to warnings
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },
);