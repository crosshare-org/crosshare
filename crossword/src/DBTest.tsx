/** @jsx jsx */
import { jsx } from '@emotion/core';

import { RouteComponentProps } from "@reach/router";

import * as WordDB from './WordDB';
import { Page } from './Page';

export const DBTest = (_: RouteComponentProps) => {
  WordDB.initialize();
  if (WordDB.dbStatus === WordDB.DBStatus.notPresent) {
    WordDB.build();
  }

  if (WordDB.dbStatus === WordDB.DBStatus.present && WordDB.dbEncoded) {
    return (
      <Page><p>DB is loaded. Five letter words: {WordDB.dbEncoded.words["5"] && WordDB.dbEncoded.words["5"].length}</p>
      </Page>
    );
  }
  return <Page>DB status: {WordDB.dbStatus}</Page>
}
