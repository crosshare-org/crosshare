import { init } from '@sentry/nextjs';
import { config } from './sentryConfig';

init(config);
