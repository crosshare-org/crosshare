/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";

import { AuthContext, requiresAdmin } from './App';
import { Page } from './Page';

export const Admin = requiresAdmin((_: RouteComponentProps) => {
  const {user} = React.useContext(AuthContext);
  if (!user) {
    throw new Error("bad user in context");
  }
  return (
    <Page title="Admin">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid black' }}>Admin</h4>
        <p>You're logged in as <b>{user.email}</b>.</p>
      </div>
    </Page>
  );
});
