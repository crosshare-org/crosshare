/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { RouteComponentProps } from "@reach/router";

import { DBContext, DBStatus } from './WordDB';
import { Page } from './Page';

export const DBTest = (_: RouteComponentProps) => {
  const state = React.useContext(DBContext);
  state.initialize();
  if (state.dbStatus === DBStatus.notPresent) {
    state.build();
  }

  if (state.dbStatus === DBStatus.present && state.db) {
    return (
      <Page><p>DB is loaded. Five letter words: {state.db.words["5"] && state.db.words["5"].length}</p>
      </Page>
    );
  }
  return <Page>DB status: {state.dbStatus}</Page>
}
