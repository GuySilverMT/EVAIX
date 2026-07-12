import './instrumentation.js'; // Must be top line
import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import './services/IngestionService.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createTRPCContext as createContext } from './trpc.js';
import { openAiRouter } from './routers/openai-compatible.router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import { llmRouter } from './routers/llm.router.js';
import { ProviderManager } from './services/ProviderManager.js';
import { createVolcanoTelemetry } from 'volcano-sdk';
// import { scheduler } from './services/JobScheduler.js';
// import { persistentModelDoctor } from './services/PersistentModelDoctor.js';
import { API_PORT, API_HOST, DEFAULT_CORS_ORIGIN, VOLCANO_TELEMETRY_ENABLED } from './config/constants.js';
import { initializeMockEngines } from './services/voice/mockEngines.js';
import { initSchedulerDaemon, watchSchedulerFile } from './services/scheduler.service.js';
import { mountSchedulerRestRoutes } from './routers/scheduler.router.js';

// Initialize Telemetry
if (process.env.VOLCANO_TELEMETRY_ENABLED === VOLCANO_TELEMETRY_ENABLED) {
  createVolcanoTelemetry({
    serviceName: process.env.OTEL_SERVICE_NAME,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
}

/**
 * Initializes and starts the application server.
 */
async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const port = API_PORT;

  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
  // Removed strict encryption key check as we are using env vars for keys now.
  if (ENCRYPTION_KEY && ENCRYPTION_KEY.length > 0) {
    console.log('Encryption key present (legacy check).');
  }

  // Apply essential middlewares
  // Add request logging
  app.use(morgan('dev'));

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
          .split(',')
          .map(o => o.trim())
          .filter(Boolean);

        // Allow requests with no origin (like mobile apps or curl requests)
        // or requests where the origin is explicitly in the whitelist
        if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use('/badbuilder', express.static(path.join(__dirname, '../../badbuilder')));

  // Mount EVAIX Scheduler REST endpoints
  mountSchedulerRestRoutes(app);

  // REST wrapper for VFS write
  app.post('/api/vfs/write', async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Missing path or content' });
      }
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      
      await fs.mkdir(pathModule.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf-8');
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('[REST VFS Write Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST wrapper for VFS read
  app.get('/api/vfs/read', async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: 'Missing path parameter' });
      }
      const fs = await import('fs/promises');
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          const fileName = path.basename(filePath);
          if (fileName.endsWith('.layout.json')) {
            const defaultPath = path.join(__dirname, '../../badbuilder', fileName);
            try {
              content = await fs.readFile(defaultPath, 'utf-8');
              // Automatically seed the file in the workspace
              await fs.mkdir(path.dirname(filePath), { recursive: true });
              await fs.writeFile(filePath, content, 'utf-8');
              console.log(`[REST VFS Read] Seeded default layout ${fileName} to ${filePath}`);
            } catch (fallbackErr) {
              return res.status(404).json({ error: 'File not found' });
            }
          } else {
            return res.status(404).json({ error: 'File not found' });
          }
        } else {
          throw err;
        }
      }
      res.json({ content });
    } catch (err: any) {
      console.error('[REST VFS Read Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Setup tRPC endpoint
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ path, error }) {
        console.error(`tRPC Error on '${path}':`, error);
      },
    })
  );

  // Initialize WebSocket service
  const wsService = new WebSocketService(server);
  // Register singleton so other services can broadcast events
  try {
    const { setWebSocketService } = await import('./services/websocket.singleton.js');
    setWebSocketService(wsService);
  } catch (err) {
    console.warn('Failed to register WebSocketService singleton:', err);
  }

  // ProviderManager initialization removed as models are now handled by LiteLLM

  // ==============================================================================
  // RUN THE ANTI-CORRUPTION PIPELINE (Non-Blocking Optimized)
  // DEPRECATED: Providers and Models are now fully handled by the local LiteLLM proxy config.
  // ==============================================================================
  console.log('✅ LiteLLM Proxy is handling all model routing. Bypassing legacy API Ingestion.');

  // Mount RESTful API routers
  app.use('/api', openAiRouter);

  // Global error handler for REST routes
  // This should be the last middleware added
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message, // In production, you might want to avoid sending the raw message
    });
  });

  server.listen(port, () => {
    void (async () => {
      console.log(`API server listening at ${API_HOST}:${port}`);

      // Legacy model inventory logger removed (handled by LiteLLM)

      // Start background services
      console.log('\n🔧 Starting background services...');

      // [EVAIX-SCHEDULER] Start cron daemon + file-watcher
      try {
        watchSchedulerFile();          // Set up fs.watch + ensure .userData/scheduler.json exists
        await initSchedulerDaemon();   // Parse jobs, arm timers
        console.log('✅ EVAIX Scheduler daemon active.');
      } catch (schedErr) {
        console.warn('⚠️ Scheduler daemon failed to start:', schedErr);
      }


      // [NEW] Trigger Background MCP Tool Sync
      // This ensures the UI reflects any new MCP servers added to RegistryClient
      void import('./services/McpToolSyncService.js').then(({ McpToolSyncService }) => {
        void McpToolSyncService.syncAllTools()
          .then(stats => console.log(`[McpSync] Startup sync complete. Tools: ${stats.tools}`))
          .catch(err => console.error('[McpSync] Startup sync failed:', err));
      });

      // [AUTONOMIC RESILIENCE] Start LogWarden
      void import('./services/LogWarden.js').then(({ logWarden }) => {
        logWarden.start();
      }).catch(err => console.error('[LogWarden] Failed to start:', err));

      // Start persistent model doctor
      // try {
      //   await persistentModelDoctor.start();
      // } catch (err) {
      //   console.warn('⚠️ Persistent model doctor failed to start:', err);
      // }

      // [NEW] Start Automated Codebase Embedding
      void import('./services/FileWatcherService.js').then(({ fileWatcherService }) => {
        void fileWatcherService.startAutomatedWatching()
          .then(() => console.log('[FileWatcher] Automated embedding service active'))
          .catch(err => console.error('[FileWatcher] Failed to start automated embedding:', err));
      });

      // Initialize mock voice engines for development
      try {
        await initializeMockEngines();
        console.log('✅ Mock voice engines initialized');
      } catch (err) {
        console.warn('⚠️ Failed to initialize mock voice engines:', err);
      }
    })();
  });


  let isShuttingDown = false;

  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop background services first
    // persistentModelDoctor.stop();

    server.close(() => {
      void (async () => {
        console.log('HTTP server closed.');
        wsService.close(); // Assuming WebSocketService has a .close() method
        console.log('Database connection closed.');
        process.exit(0);
      })();
    });

    // Force exit if graceful shutdown takes too long (e.g. 5s)
    setTimeout(() => {
      console.error('Forcing shutdown after timeout...');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// START THE AUTONOMY ENGINE
// scheduler.start(5000); // Check for work every 5 seconds
// NOTE: Disabled until jobs table is created via migration.
// JobScheduler will gracefully handle missing tables when enabled.

console.log('Server starting... (Force Restart 2)');
void startServer();
