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
