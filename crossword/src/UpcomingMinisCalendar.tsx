/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { PuzzleResult, puzzleFromDB } from './types';
import { DBPuzzleV } from './common/dbtypes';

declare var firebase: typeof import('firebase');

function sameDay(d1: Date, d2: Date) {
  if (!d1) {
    return false;
  }
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export interface UpcomingMinisCalendarProps {
  value?: Date,
  disableExisting: boolean,
  onChange: (date: Date, puzzle: PuzzleResult | null) => void
}

const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const [upcomingMinis, setUpcomingMinis] = React.useState<Array<PuzzleResult> | null>(null);
  const [error, setError] = React.useState(false);
  const tileDisabled = React.useCallback(({ date }: { date: Date }) => {
    if (!upcomingMinis) {
      return !props.disableExisting;
    }
    let result = !props.disableExisting;
    upcomingMinis.forEach((mini) => {
      if (mini.publishTime && sameDay(mini.publishTime.toDate(), date)) {
        result = props.disableExisting;
      }
    });
    return result;
  }, [upcomingMinis, props.disableExisting]);

  React.useEffect(() => {
    console.log("loading minis");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDay() - 1);
    db.collection('c').where("c", "==", "dailymini")
      .where("p", ">", firebase.firestore.Timestamp.fromDate(yesterday))
      .get().then((value) => {

        let results: Array<PuzzleResult> = [];
        value.forEach(doc => {
          const data = doc.data();
          const validationResult = DBPuzzleV.decode(data);
          if (isRight(validationResult)) {
            results.push({ ...puzzleFromDB(validationResult.right), id: doc.id });
          } else {
            console.error(PathReporter.report(validationResult).join(","));
            setError(true);
          }
        });
        setUpcomingMinis(results);
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
    let miniForDate: PuzzleResult | null = null;
    if (upcomingMinis) {
      for (const mini of upcomingMinis) {
        if (mini.publishTime && sameDay(mini.publishTime.toDate(), d)) {
          miniForDate = mini;
          break;
        }
      }
    }

    props.onChange(d, miniForDate);
  }, [props, upcomingMinis]);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return <Calendar value={props.value} onChange={dateChanged} minDate={new Date()} maxDate={nextMonth} tileDisabled={tileDisabled} />
}

export default UpcomingMinisCalendar;
