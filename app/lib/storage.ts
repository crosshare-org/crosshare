import * as t from 'io-ts';
import { PathReporter } from './pathReporter.js';

export function fromLocalStorage<A>(
  key: string,
  validator: t.Type<A>
): A | null {
  let inSession: string | null;
  try {
    inSession = localStorage.getItem(key);
  } catch {
    /* happens on incognito when iframed */
    console.warn(`couldn't load ${key} from LS`);
    inSession = null;
  }
  if (inSession) {
    const res = validator.decode(JSON.parse(inSession));
    if (res._tag === 'Right') {
      return res.right;
    } else {
      console.error("Couldn't parse object in local storage");
      console.error(PathReporter.report(res).join(','));
    }
  }
  return null;
}

export function arrayFromLocalStorage<A>(
  key: string,
  validator: t.Type<A>
): A[] {
  const res = fromLocalStorage(key, t.array(validator));
  return res || [];
}
