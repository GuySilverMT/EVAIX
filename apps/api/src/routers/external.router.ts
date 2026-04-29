import { createTRPCRouter, publicProcedure } from '../trpc.js';
import axios from 'axios';

export const externalRouter = createTRPCRouter({
  getOpenRouterRaw: publicProcedure.query(async () => {
    const response = await axios.get('https://openrouter.ai/api/v1/models');
    return response.data;
  }),
});
