import { captureRouterTransitionStart, init } from '@sentry/nextjs';
import { config } from './sentryConfig.js';

init(config);

export const onRouterTransitionStart = captureRouterTransitionStart;
