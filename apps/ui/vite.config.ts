import path from "path"
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
// 1. Import the polyfill plugin
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
    // 2. Enable the polyfills. This replaces your manual aliases.
    nodePolyfills({
      include: ['fs', 'os', 'path', 'util', 'process', 'buffer', 'events', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    // 3. Remove the manual process overrides that might conflict
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // REMOVED: Direct alias to nebula/src causes TypeScript to be bundled
      // Let pnpm/node resolve @repo/nebula to the built dist folder instead

      // 4. REMOVE ALL THESE MANUAL SHIMS
      // The plugin handles "node:fs", "os", "process" etc. automatically.
    },
  },
  optimizeDeps: {
    // Exclude TypeScript and nebula internals from being bundled in browser
    exclude: ['typescript'],
    esbuildOptions: {
      loader: {
        '.ts': 'ts'
      }
    }
  },
  build: {
    commonjsOptions: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
      transformMixedEsModules: true,
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/trpc': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
