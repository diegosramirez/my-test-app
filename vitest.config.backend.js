import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend',
    root: './backend',
    environment: 'node',
    include: ['**/*.spec.js', '**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.js'],
      exclude: [
        '**/*.spec.js',
        '**/*.test.js',
        'node_modules/**',
        'coverage/**',
        'public/**'
      ]
    },
    setupFiles: ['./test-setup.js']
  }
});