const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export const config = {
  dsn:
    SENTRY_DSN ||
    'https://aef749dfcec64668bf922b8fbe4c0b41@o117398.ingest.sentry.io/5192748',
  sendDefaultPii: true,
  ignoreErrors: [
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop limit exceeded',
    'A mutation operation was attempted on a database that did not allow mutations',
    'is not a valid value for enumeration ScrollLogicalPosition',
    'Extension context invalidated',
    'entryTypes contained only unsupported types',
    'The popup has been closed by the user before finalizing the operation',
    'SecurityError: Blocked a frame with origin "https://crosshare.org"',
    'LPContentScriptFeatures',
    'because the client is offline',
    'Object.fromEntries is not a function',
    'cancelled due to another conflicting popup being opened',
    'installations/app-offline',
    'Error: Network Error',
    'Non-Error promise rejection captured with value: Object Not Found Matching',
    'Failed to fetch',
    'Illegal invocation',
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/network-request-failed',
    'auth/cancelled-popup-request',
    'Connection to Indexed Database server lost.',
    'Database deleted by request of the user',
    '.getRestrictions is not a function',
    'anyweb-to-anyweb-unprivileged-api-v1',
    'auth/user-disabled',
    "Can't find variable: cordova",
    'cordova is not defined',
    'Invalid call to runtime.sendMessage(). Tab not found.',
  ],
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
};
