import * as React from 'react';
import * as t from "io-ts";
import LZString from 'lz-string';
import { isRight } from 'fp-ts/lib/Either'
import { PathReporter } from "io-ts/lib/PathReporter";
import localforage from 'localforage';


export const WordDBV = t.type({
  words: t.record(t.string, t.array(t.tuple([t.string, t.number]))),
  bitmaps: t.record(t.string, t.record(t.string, t.record(t.string, t.number))),
});
export type WordDB = t.TypeOf<typeof WordDBV>;

export enum DBStatus {
  uninitialized,
  building,
  notPresent,
  present,
  disabled,
}

interface DBContextValue {
  db: WordDB|undefined,
  dbStatus: DBStatus,
  initialize: () => void,
  build: () => void,
  setDb: (db:WordDB|undefined, dbStatus:DBStatus) => void
}

export const DBContext = React.createContext<DBContextValue>({
  db: undefined,
  dbStatus: DBStatus.uninitialized,
  initialize: () => {},
  build: () => {},
  setDb: (_db, _dbState) => {}
});

function parseJsonDB(data:string) {
  const validationResult = WordDBV.decode(JSON.parse(data));
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(","));
  }
}

export const DBContextProvider = (props: {children: React.ReactNode}) => {

  const initState = {
    db: undefined,
    dbStatus: DBStatus.uninitialized,
  }
  const [dbctx, setDbctx] = React.useState<{db: WordDB|undefined, dbStatus: DBStatus}>(initState)

  const setDb = (db: WordDB|undefined, dbStatus: DBStatus) => {
    setDbctx({db, dbStatus});
  }

  const initialize = React.useCallback(() => {
    if (dbctx.dbStatus !== DBStatus.uninitialized) return;
    setDb(undefined, DBStatus.building);
    localforage.getItem("db").then((compressed) => {
      if (compressed) {
        console.log("loading db from storage");
        setDb(parseJsonDB(LZString.decompress(compressed as string)), DBStatus.present);
      } else {
        setDb(undefined, DBStatus.notPresent);
      }
    }).catch((err) => console.log(err));
  }, [dbctx]);

  const build = React.useCallback(() => {
    // Only allow a build if state is notPresent or disabled
    if (dbctx.dbStatus === DBStatus.building || dbctx.dbStatus === DBStatus.present || dbctx.dbStatus === DBStatus.uninitialized) return;
    console.log("building db");
    setDb(undefined, DBStatus.building);
    fetch('_db.json')
    .then((r) => r.text())
    .then((data) => {
      localforage.setItem("db", LZString.compress(data))
      setDb(parseJsonDB(data), DBStatus.present);
    });
  }, [dbctx]);

  return (
    <DBContext.Provider value={{...dbctx, setDb, initialize, build}}>
      {props.children}
    </DBContext.Provider>
  )
}
