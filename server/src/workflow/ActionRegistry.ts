import { Context } from './types';

export type ActionFunction<TContext extends Context = Context> = (ctx: TContext, params?: any) => Promise<void> | void;

export const ActionRegistry: Record<string, ActionFunction> = {
  log: async (ctx, params) => {
    console.log(`[Action: LOG] ContextId: ${JSON.stringify(ctx)} | Message: ${params?.message || 'No message'}`);
  },
  logDelayed: async (ctx, params) => {
    const delay = params?.delay || 2000;
    console.log(`[Action: LOG_DELAYED] Starting wait of ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    console.log(`[Action: LOG_DELAYED] Finished waiting. Message: ${params?.message || 'No message'}`);
  },
};
