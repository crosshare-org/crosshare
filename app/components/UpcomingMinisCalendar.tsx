import { useEffect, useState } from 'react';
import { getMiniIdForDate } from '../lib/dailyMinis.js';
import { logAsyncErrors } from '../lib/utils.js';
import { ButtonReset } from './Buttons.js';
import styles from './UpcomingMinisCalendar.module.css';

const daysToDisplay = 42;
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function sameDate(d1: Date, d2: Date) {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

interface DayProps {
  day: Date;
  selected: Date;
  disableExisting: boolean;
  onChange: (date: Date, crosswordId: string | null) => void;
}
const Day = (props: DayProps) => {
  const today = new Date();
  const [disabled, setDisabled] = useState(true);
  const [miniId, setMiniId] = useState<string | null>(null);
  useEffect(() => {
    let finished = false;
    logAsyncErrors(async function () {
      const lookup = await getMiniIdForDate(props.day);
      if (finished) {
        return;
      }
      if (lookup !== null) {
        setMiniId(lookup);
        setDisabled(props.disableExisting);
      } else {
        setDisabled(!props.disableExisting);
      }
    })();
    return () => {
      finished = true;
    };
  });
  const isToday = sameDate(props.day, today);
  const isSelected = sameDate(props.day, props.selected);
  return (
    <ButtonReset
      data-is-selected={isSelected}
      data-is-today={isToday}
      className={styles.day}
      {...(isToday && { 'data-testid': 'today-button' })}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          props.onChange(props.day, miniId);
        }
      }}
      text={props.day.getDate().toString()}
    />
  );
};

interface UpcomingMinisCalendarProps {
  value?: Date;
  disableExisting: boolean;
  onChange: (date: Date, crosswordId: string | null) => void;
}

export const UpcomingMinisCalendar = (props: UpcomingMinisCalendarProps) => {
  const today = new Date();
  const selected = props.value || today;
  const [monthToShow, setMonthToShow] = useState(selected);
  const year = monthToShow.getUTCFullYear();
  const month = monthToShow.getUTCMonth();
  const firstMonthDay = new Date(year, month, 0);
  const firstMonthDayNumber = firstMonthDay.getDay();
  const firstDayToDisplay = new Date(year, month, -firstMonthDayNumber);

  function changeMonth(incr: number) {
    const changed = new Date(monthToShow);
    changed.setUTCMonth(changed.getUTCMonth() + incr);
    setMonthToShow(changed);
  }

  return (
    <div className={styles.cal}>
      <div className={styles.head}>
        <ButtonReset
          className={styles.monthNav}
          onClick={() => {
            changeMonth(-1);
          }}
          text={'<'}
        />
        <div className={styles.month}>
          {monthLabels[month]} <span>{year}</span>
        </div>
        <ButtonReset
          className={styles.monthNav}
          onClick={() => {
            changeMonth(1);
          }}
          text={'>'}
        />
      </div>
      <div className={styles.body}>
        {dayLabels.map((label) => (
          <div className={styles.dayLabel} key={label}>
            {label}
          </div>
        ))}
        {Array(daysToDisplay)
          .fill(0)
          .map((_, i) => {
            const d = new Date(firstDayToDisplay);
            d.setDate(d.getDate() + i);
            return (
              <Day
                key={i}
                day={d}
                selected={selected}
                disableExisting={props.disableExisting}
                onChange={props.onChange}
              />
            );
          })}
      </div>
    </div>
  );
};
