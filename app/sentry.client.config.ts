import * as Sentry from '@sentry/nextjs';
import { config } from './sentryConfig';

Sentry.init(config);
