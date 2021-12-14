import { isSome } from 'fp-ts/lib/Option';
import { useEffect, useState } from 'react';
import { getMiniIdForDate } from '../lib/dailyMinis';
import { App } from '../lib/firebaseWrapper';
import { ButtonReset } from './Buttons';

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
  const db = App.firestore();
  const today = new Date();
  const [disabled, setDisabled] = useState(true);
  const [miniId, setMiniId] = useState<string | null>(null);
  useEffect(() => {
    let finished = false;
    (async function () {
      const lookup = await getMiniIdForDate(db, props.day);
      if (finished) {
        return;
      }
      if (isSome(lookup)) {
        setMiniId(lookup.value);
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
      css={{
        display: 'inline-block',
        width: '14%',
        textAlign: 'center',
        padding: '0.5em 0',
        color: disabled ? 'var(--default-text)' : 'var(--text)',
        backgroundColor: isSelected
          ? 'var(--primary)'
          : isToday
          ? 'var(--lighter)'
          : disabled
          ? 'var(--secondary)'
          : 'var(--bg)',
        '&:hover': {
          backgroundColor: isSelected
            ? 'var(--primary)'
            : isToday
            ? 'var(--lighter)'
            : 'var(--secondary)',
        },
      }}
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
    <div
      css={{
        border: '1px solid var(--black)',
        userSelect: 'none',
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--black)',
          padding: '0.5em 0',
          textAlign: 'center',
        }}
      >
        <ButtonReset
          css={{
            flexGrow: 1,
          }}
          onClick={() => changeMonth(-1)}
          text={'<'}
        />
        <div
          css={{
            flexGrow: 2,
          }}
        >
          {monthLabels[month]} <span>{year}</span>
        </div>
        <ButtonReset
          css={{
            flexGrow: 1,
          }}
          onClick={() => changeMonth(1)}
          text={'>'}
        />
      </div>
      <div
        css={{
          width: '100%',
          marginLeft: '1%',
        }}
      >
        {dayLabels.map((label) => (
          <div
            css={{
              display: 'inline-block',
              width: '14%',
              textAlign: 'center',
              margin: '0.5em 0',
              fontWeight: 'bold',
            }}
            key={label}
          >
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
