import { init } from '@sentry/nextjs';
import { config } from './sentryConfig.js';

init(config);
