import React from 'react';
import ReactDOM from 'react-dom';
import "./style.css";
import App from './App';
import * as serviceWorker from './serviceWorker';
import * as Sentry from '@sentry/browser';

Sentry.init({dsn: "https://aef749dfcec64668bf922b8fbe4c0b41@o117398.ingest.sentry.io/5192748"});

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
