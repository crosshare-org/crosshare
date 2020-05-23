import '@testing-library/jest-dom';
import { matchers, createSerializer } from 'jest-emotion';

// Add the custom matchers provided by 'jest-emotion'
expect.extend(matchers);
expect.addSnapshotSerializer(createSerializer());
