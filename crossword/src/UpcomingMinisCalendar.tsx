/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { getDateString } from './common/dbtypes';

declare var firebase: typeof import('firebase');

export interface UpcomingMinisCalendarProps {
  value?: Date,
  disableExisting: boolean,
  onChange: (date: Date, crosswordId: string | null) => void
}

const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const [minis, setMinis] = React.useState<{ [k: string]: string } | null>(null);
  const [error, setError] = React.useState(false);
  const tileDisabled = React.useCallback(({ date }: { date: Date }) => {
    if (!minis) {
      return !props.disableExisting;
    }
    if (minis.hasOwnProperty(getDateString(date))) {
      return props.disableExisting;
    }
    return !props.disableExisting;
  }, [minis, props.disableExisting]);

  React.useEffect(() => {
    console.log("loading minis");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection('categories').doc('dailymini').get().then((value) => {
      const doc = value.data();
      if (!doc) {
        console.log("Missing daily minis doc");
        setError(true);
      } else {
        setMinis(doc);
      }
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
  }, [error]);

  const dateChanged = React.useCallback((d: Date | Date[]) => {
    if (d instanceof Array) {
      console.error("How'd we get here");
      return;
    }
    props.onChange(d, minis && minis[getDateString(d)]);
  }, [props, minis]);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return <Calendar value={props.value} onChange={dateChanged} tileDisabled={tileDisabled} />
}

export default UpcomingMinisCalendar;
