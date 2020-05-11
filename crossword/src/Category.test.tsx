import React from 'react';
import { render, initFirebaseForTesting } from './testUtils';
import { Category } from './Category';
import * as firebase from '@firebase/testing';

var adminApp = firebase.initializeAdminApp({
  projectId: "mdcrosshare",
});

initFirebaseForTesting();

test('basic category page test', async () => {
  window.HTMLElement.prototype.scrollIntoView = function() { };

  await adminApp.firestore().collection('categories').doc('dailymini').set({ '2020-4-10': 'foobar' });

  const { findByText } = render(<Category categoryId='dailymini' />);

  const link = await findByText('Daily Mini for 5/10/2020');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/crosswords/foobar');
});
