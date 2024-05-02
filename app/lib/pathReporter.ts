import {
  type Context,
  type Validation,
  type ValidationError,
  getFunctionName,
} from 'io-ts';

function stringify(v: unknown): string {
  if (typeof v === 'function') {
    return getFunctionName(v);
  }
  if (typeof v === 'number' && !isFinite(v)) {
    if (isNaN(v)) {
      return 'NaN';
    }
    return v > 0 ? 'Infinity' : '-Infinity';
  }
  return JSON.stringify(v);
}

function getContextPath(context: Context): string {
  return context.map(({ key, type }) => `${key}: ${type.name}`).join('/');
}

function getMessage(e: ValidationError): string {
  return e.message !== undefined
    ? e.message
    : `Invalid value ${stringify(e.value)} supplied to ${getContextPath(
        e.context
      )}`;
}

export const PathReporter = {
  report: (v: Validation<unknown>): string[] => {
    if (v._tag === 'Right') {
      return ['No errors'];
    }
    return v.left.map(getMessage);
  },
};
