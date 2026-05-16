import 'server-only';
import { headers } from 'next/headers';
import { createTRPCContext } from '@/server/trpc/init';
import { appRouter } from '@/server/trpc/routers/_app';
import { createCallerFactory } from '@/server/trpc/init';

const createCaller = createCallerFactory(appRouter);

export const caller = createCaller(async () =>
  createTRPCContext({ headers: await headers() })
);
