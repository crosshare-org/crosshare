import React from 'react';
import { Comments } from './Comments';
import { anonymousUser, render, initFirebaseForTesting } from './testUtils';
import { getTimestampClass } from './firebase';
import * as firebase from '@firebase/testing';

initFirebaseForTesting();

const testComments = [
  {
    i: 'comment-id',
    c: 'my first comment',
    a: 'comment-author-id',
    n: 'Mike D',
    t: 55.4,
    ch: false,
    p: getTimestampClass().now()
  }
];

test('basic comment display', () => {
  const { getByText } = render(<Comments solveTime={10} didCheat={false} puzzleId='puzz' puzzleAuthorId='puzzAuthor' user={anonymousUser} comments={testComments} />);
  expect(getByText(/my first comment/i)).toBeVisible();
})

test('security rules should only allow commenting as onesself', async () => {
  var app = firebase.initializeTestApp({
    projectId: "mdcrosshare",
    auth: {
      uid: "mike", admin: false, firebase: {
        sign_in_provider: "google.com"
      }
    }
  });

  await firebase.assertFails(app.firestore().collection('cfm').add({ c: 'comment text' }));
  await firebase.assertFails(app.firestore().collection('cfm').add({ c: 'comment text', a: 'jared' }));
  await firebase.assertSucceeds(app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' }));
});

test('security rules should only allow commenting if non-anonymous', async () => {
  var app = firebase.initializeTestApp({
    projectId: "mdcrosshare",
    auth: {
      uid: "mike", admin: false, firebase: {
        sign_in_provider: "anonymous"
      }
    }
  });

  await firebase.assertFails(app.firestore().collection('cfm').add({ c: 'comment text' }));
  await firebase.assertFails(app.firestore().collection('cfm').add({ c: 'comment text', a: 'jared' }));
  await firebase.assertFails(app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' }));
});

test.todo('should only show moderated comments');
test.todo('should show unmoderated comments by onesself');
test.todo('should only allow non-anonymous users to comment');
test.todo('admin should be able to moderate comments')

test.todo('comment snapshot test');
