import { createTRPCReact } from '@trpc/react-query';
// ✅ FIX: Import the AppRouter type directly from the API source
// This bypasses the empty api-contract and gives you full type safety
import type { AppRouter } from '../../../api/src/routers/index.js';

export const trpc = createTRPCReact<AppRouter>();
