import React from 'react';
import { anonymousUser, cleanup, render, fireEvent } from '../lib/testingUtils';
import { BuilderPage } from '../pages/construct';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';

jest.mock('../lib/firebaseWrapper');
jest.mock('../lib/WordDB');

afterEach(() => {
  jest.clearAllMocks();
});

window.HTMLElement.prototype.scrollIntoView = function() { return; };

test('puzzle in progress should be cached in local storage', async () => {
  sessionStorage.clear();
  localStorage.clear();

  const app = firebaseTesting.initializeTestApp({
    projectId: 'test1',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  });
  setApp(app as firebase.app.App);

  let r = render(
    <BuilderPage isAdmin={false} user={anonymousUser} />, { user: anonymousUser }
  );
  await r.findByText(/Across/i);

  fireEvent.keyDown(r.container, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(r.container, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(r.container, { key: 'C', keyCode: 67 });

  expect(r.getByLabelText('cell0x1')).toHaveTextContent('B');
  expect(r.getByLabelText('cell0x2')).toHaveTextContent('C');
  expect(r.getByLabelText('grid')).toMatchSnapshot();

  await cleanup();

  // Now try again!
  r = render(
    <BuilderPage isAdmin={false} user={anonymousUser} />, { user: anonymousUser }
  );
  await r.findByText(/Across/i);
  expect(r.getByLabelText('cell0x1')).toHaveTextContent('B');
  expect(r.getByLabelText('cell0x2')).toHaveTextContent('C');

  await app.delete();
});
