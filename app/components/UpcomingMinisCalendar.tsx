import { useState, useCallback, useEffect } from 'react';

import { getDateString, CategoryIndexT, CategoryIndexV } from '../lib/dbtypes';
import { getFromSessionOrDB } from '../lib/dbUtils';
import { Calendar } from './Calendar';

interface UpcomingMinisCalendarProps {
  value?: Date,
  disableExisting: boolean,
  onChange: (date: Date, crosswordId: string | null) => void
}

export const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const [minis, setMinis] = useState<CategoryIndexT | null>(null);
  const [error, setError] = useState(false);
  const tileDisabled = useCallback((ts: Date) => {
    if (!minis) {
      return !props.disableExisting;
    }
    if (minis.hasOwnProperty(getDateString(ts))) {
      return props.disableExisting;
    }
    return !props.disableExisting;
  }, [minis, props.disableExisting]);

  useEffect(() => {
    getFromSessionOrDB('categories', 'dailymini', CategoryIndexV, 24 * 60 * 60 * 1000)
      .then(setMinis)
      .catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, [error]);

  const dateChanged = useCallback((d: Date) => {
    props.onChange(d, minis && minis[getDateString(d)]);
  }, [props, minis]);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return <Calendar selected={props.value} onClick={dateChanged} dateIsDisabled={tileDisabled} />
}
