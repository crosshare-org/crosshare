import React, { Component } from 'react';
import * as Sentry from '@sentry/browser';

const MISSING_ERROR = 'Error was swallowed during propagation.';

interface EBState {
  eventId: string | null,
  error: Error | null
}
export class ErrorBoundary extends Component {
  readonly state: EBState = { eventId: null, error: null };

  componentDidCatch(error: Error | null, errorInfo: object) {
    this.setState({ error: error || new Error(MISSING_ERROR) });
    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope((scope) => {
        scope.setExtras(errorInfo);
        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <>
          <div>Sorry! An error with Crosshare occurred - we have been notified but you can also email us for help at crosshare@googlegroups.com</div>
          <div>Event Id: {this.state.eventId}</div>
        </>
      );
    }

    //when there's not an error, render children untouched
    return this.props.children;
  }
}
