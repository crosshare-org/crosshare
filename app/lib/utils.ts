import formatDistanceToNow from 'date-fns/formatDistanceToNow';

export const STORAGE_KEY = 'puzzleInProgress';

export const slugify = (...args: (string | number)[]): string => {
  const value = args.join(' ');

  return value
    .replace(/-/g, ' ')
    .normalize('NFD') // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, '-'); // separator
};

export function timeString(elapsed: number, fixedSize: boolean): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - hours * 3600) / 60);
  const seconds = Math.floor(elapsed - hours * 3600 - minutes * 60);
  if (hours === 0 && minutes === 0 && !fixedSize) {
    return seconds + 's';
  }
  if (hours === 0 && !fixedSize) {
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
  return (
    hours +
    ':' +
    (minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds
  );
}

export function pastDistanceToNow(date: Date) {
  if (date > new Date()) {
    return 'just now';
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

export function hslToRgb(h: number, s: number, l: number) {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function fnv1a(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    const characterCode = input.charCodeAt(i);
    hash ^= characterCode;
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalize(n: string) {
  return n.toLowerCase().replace(/[\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
}

export function isMetaSolution(
  submission: string | undefined,
  solutions: Array<string>
) {
  if (submission === undefined) {
    return false;
  }
  const normalized = normalize(submission);
  for (const solution of solutions) {
    if (normalize(solution) === normalized) {
      return true;
    }
  }
  return false;
}
