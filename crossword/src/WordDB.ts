import * as t from "io-ts";
import LZString from 'lz-string';
import { isRight } from 'fp-ts/lib/Either'
import { PathReporter } from "io-ts/lib/PathReporter";
import localforage from 'localforage';

const WordDBV = t.type({
  words: t.record(t.string, t.array(t.tuple([t.string, t.number]))),
  bitmaps: t.record(t.string, t.record(t.string, t.record(t.string, t.number))),
});
export type WordDBT = t.TypeOf<typeof WordDBV>;

export enum DBStatus {
  uninitialized,
  building,
  notPresent,
  present,
  disabled,
}

function parseJsonDB(data:string) {
  const validationResult = WordDBV.decode(JSON.parse(data));
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(","));
  }
}

export let db: WordDBT|undefined = undefined;
export let dbStatus: DBStatus = DBStatus.uninitialized;

export const initialize = () => {
  if (dbStatus !== DBStatus.uninitialized) return;
  dbStatus = DBStatus.building;
  localforage.getItem("db").then((compressed) => {
    if (compressed) {
      console.log("loading db from storage");
      db = parseJsonDB(LZString.decompress(compressed as string));
      dbStatus = DBStatus.present;
    } else {
      dbStatus = DBStatus.notPresent;
    }
  }).catch((err) => console.log(err));
}

export const build = () => {
  // Only allow a build if state is notPresent or disabled
  if (dbStatus !== DBStatus.notPresent && dbStatus !== DBStatus.disabled) {
    return;
  }
  console.log("building db");
  dbStatus = DBStatus.building;
  fetch('_db.json')
  .then((r) => r.text())
  .then((data) => {
    localforage.setItem("db", LZString.compress(data))
    db = parseJsonDB(data);
    dbStatus = DBStatus.present;
  });
}
