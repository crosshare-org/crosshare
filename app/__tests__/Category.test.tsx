import React from 'react';
import { render } from '../lib/testingUtils';
import CategoryPage, { propsForCategoryId } from '../pages/categories/[categoryId]';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';

let adminApp: firebase.app.App;
let app: firebase.app.App;

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId: 'categorytest' }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({ projectId: 'categorytest' }) as firebase.app.App;
  setApp(app);

  await adminApp.firestore().collection('categories').doc('dailymini').set({ '2020-4-10': 'foobar' });
});

afterAll(async () => {
  await app.delete();
  await adminApp.delete();
});

test('basic category page test', async () => {
  const props = await propsForCategoryId('dailymini');
  const { findByText } = render(<CategoryPage {...props} />, {});

  const link = await findByText('Daily Mini for 5/10/2020');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/crosswords/foobar');
});

test('category 404', async () => {
  const props = await propsForCategoryId('dailyfulllength');
  const { getByText } = render(<CategoryPage {...props} />, {});

  expect(getByText(/invalid category/i)).toBeVisible();
});
