import { navigate } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { puzzleFromDB, TimestampedPuzzleT } from './types';
import { DBPuzzleV } from './common/dbtypes';

declare var firebase: typeof import('firebase');

export function timeString(elapsed: number): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
  const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
  return hours + ':' +
    (minutes < 10 ? "0" : "") + minutes + ':' +
    (seconds < 10 ? "0" : "") + seconds;
}

export function navToLatestMini(priorTo: firebase.firestore.Timestamp, onError: () => void, onMissing?: () => void) {
  const db = firebase.firestore();
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
          const puzzle = puzzleFromDB(validationResult.right);
          const forStorage: TimestampedPuzzleT = { downloadedAt: firebase.firestore.Timestamp.now(), data: puzzle }
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
