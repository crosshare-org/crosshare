/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { getDateString, CategoryIndexT, CategoryIndexV } from './common/dbtypes';
import { getFromSessionOrDB } from './dbUtils';


export interface UpcomingMinisCalendarProps {
  value?: Date,
  disableExisting: boolean,
  onChange: (date: Date, crosswordId: string | null) => void
}

const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const [minis, setMinis] = React.useState<CategoryIndexT | null>(null);
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
    getFromSessionOrDB('categories', 'dailymini', CategoryIndexV, 24 * 60 * 60 * 1000)
      .then(setMinis)
      .catch(reason => {
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
