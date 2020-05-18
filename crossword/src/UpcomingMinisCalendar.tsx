/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { getDateString, CategoryIndexT, CategoryIndexV } from './common/dbtypes';
import { getFromSessionOrDB } from './dbUtils';
import { Calendar } from './Calendar';

interface UpcomingMinisCalendarProps {
  value?: Date,
  disableExisting: boolean,
  onChange: (date: Date, crosswordId: string | null) => void
}

export const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const [minis, setMinis] = React.useState<CategoryIndexT | null>(null);
  const [error, setError] = React.useState(false);
  const tileDisabled = React.useCallback((ts: Date) => {
    if (!minis) {
      return !props.disableExisting;
    }
    if (minis.hasOwnProperty(getDateString(ts))) {
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

  const dateChanged = React.useCallback((d: Date) => {
    props.onChange(d, minis && minis[getDateString(d)]);
  }, [props, minis]);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return <Calendar selected={props.value} onClick={dateChanged} dateIsDisabled={tileDisabled} />
}
