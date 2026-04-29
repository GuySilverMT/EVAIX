module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules', 'coverage', '**/*.d.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Omit `project` here to avoid running type-aware rules for files
    // that aren't included in the package TS config (pre-commit safety).
    // If you want full typed linting, restore `project` and ensure
    // all files are included in the referenced tsconfig(s).
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  }
};
