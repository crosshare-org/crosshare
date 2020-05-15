import React from 'react';
import { Comments } from './Comments';
import { render, initFirebaseForTesting } from './testUtils';
import { getTimestampClass } from './firebase';

initFirebaseForTesting();

const testComments = [
  {
    c: 'my first comment',
    a: 'comment-author-id',
    n: 'Mike D',
    t: 55.4,
    ch: false,
    p: getTimestampClass().now()
  }
];

test('basic comment display', () => {
  const { getByText } = render(<Comments comments={testComments} />);
  expect(getByText(/my first comment/i)).toBeVisible();
})

test.todo('security rules should only allow commenting as onesself');
test.todo('security rules should force new comments to be unmoderated');
test.todo('security rules should only allow an admin to moderate comments');

test.todo('should only show moderated comments');
test.todo('should show unmoderated comments by onesself');
test.todo('should only allow non-anonymous users to comment');
test.todo('admin should be able to moderate comments')

test.todo('comment snapshot test');
