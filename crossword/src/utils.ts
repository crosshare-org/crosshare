import { navigate } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { DBPuzzleV, TimestampedPuzzleT } from './common/dbtypes';
import { getTimestampClass, getFirebaseApp, FirebaseTimestamp } from './firebase';

export function timeString(elapsed: number, fixedSize: boolean): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
  const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
  if (hours === 0 && minutes === 0 && !fixedSize) {
    return seconds + 's';
  }
  if (hours === 0 && !fixedSize) {
    return minutes + ':' + (seconds < 10 ? "0" : "") + seconds;
  }
  return hours + ':' +
    (minutes < 10 ? "0" : "") + minutes + ':' +
    (seconds < 10 ? "0" : "") + seconds;
}

export function navToLatestMini(priorTo: FirebaseTimestamp, onError: () => void, onMissing?: () => void) {
  const db = getFirebaseApp().firestore();
  db.collection('c').where("c", "==", "dailymini")
    .where("p", "<", priorTo)
    .orderBy("p", "desc").limit(1).get().then((value) => {
      if (value.size === 0 && onMissing) {
        onMissing();
      }
      value.forEach(doc => { // Should be only 1 - better way to do this?
        const data = doc.data();
        const validationResult = DBPuzzleV.decode(data);
        if (isRight(validationResult)) {
          const forStorage: TimestampedPuzzleT = { downloadedAt: getTimestampClass().now(), data: validationResult.right }
          sessionStorage.setItem('c/' + doc.id, JSON.stringify(forStorage));
          navigate("/crosswords/" + doc.id);
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          onError();
        }
      });
    }).catch(reason => {
      console.error(reason);
      onError();
    });
}

export function hslToRgb(h: number, s: number, l: number) {
  var r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function fnv1a(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    let characterCode = input.charCodeAt(i);
    hash ^= characterCode;
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}
