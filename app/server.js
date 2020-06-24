// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functions = require('firebase-functions');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const next = require('next');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./next.config');

admin.initializeApp();

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
  // the absolute directory from the package.json file that initialises this module
  // IE: the absolute path from the root of the Cloud Function
  conf: config,
});
const handle = app.getRequestHandler();

const server = functions.https.onRequest((request, response) => {
  if (request.originalUrl.endsWith('.map') || request.originalUrl.endsWith('.ts') || request.originalUrl.endsWith('.tsx')) {
    return response.status(404).send('Sorry, page cannot be found');
  }
  // log the page.js file or resource being requested
  console.log('File: ' + request.originalUrl);
  return app.prepare().then(() => handle(request, response));
});

exports.nextjs = {
  server
};

exports.staging = {
  server
};