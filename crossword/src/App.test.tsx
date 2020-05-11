import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { initFirebaseForTesting } from './testUtils';

initFirebaseForTesting();

test('renders todays mini link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/today's daily mini crossword/i);
  expect(linkElement).toBeInTheDocument();
});
