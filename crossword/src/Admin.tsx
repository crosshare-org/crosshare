/** @jsx jsx */
import { jsx } from '@emotion/core';

import { RouteComponentProps } from "@reach/router";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';

export const Admin = requiresAdmin(({user}: RouteComponentProps & AuthProps) => {
  return (
    <Page title="Admin">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid black' }}>Admin</h4>
        <p>You're logged in as <b>{user.email}</b>.</p>
      </div>
    </Page>
  );
});
