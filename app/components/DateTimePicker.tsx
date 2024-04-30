import { lightFormat } from 'date-fns/lightFormat';
import { set } from 'date-fns/set';
import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
  picked: Date | number;
  setPicked: (newVal: Date) => void;
}

export const DateTimePicker = (props: DateTimePickerProps) => {
  return (
    <>
      <input
        className={styles.picker}
        type="date"
        defaultValue={lightFormat(props.picked, 'yyyy-MM-dd')}
        required
        pattern="\d{4}-\d{1,2}-\d{1,2}"
        onBlur={(e) => {
          if (!e.target.checkValidity()) {
            return;
          }
          const split = e.target.value.split('-');
          if (
            split[0] === undefined ||
            split[1] === undefined ||
            split[2] === undefined
          ) {
            throw new Error('bad date ' + e.target.value);
          }
          const newDate: Date = set(props.picked, {
            year: parseInt(split[0]),
            month: parseInt(split[1]) - 1,
            date: parseInt(split[2]),
          });
          props.setPicked(newDate);
        }}
      />
      <input
        className="marginLeft0-5em"
        type="time"
        defaultValue={lightFormat(props.picked, 'HH:mm')}
        required
        pattern="[0-9]{1,2}:[0-9]{2}"
        onBlur={(e) => {
          if (!e.target.checkValidity()) {
            return;
          }
          const split = e.target.value.split(':');
          if (split[0] === undefined || split[1] === undefined) {
            throw new Error('bad time ' + e.target.value);
          }
          const newDate = set(props.picked, {
            hours: parseInt(split[0]),
            minutes: parseInt(split[1]),
          });
          props.setPicked(newDate);
        }}
      />
    </>
  );
};
