import {
  DetailedHTMLProps,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface LengthLimitedProps {
  maxLength: number;
  updateValue: (newValue: string) => void;
}

export const LengthLimitedInput = ({
  maxLength,
  updateValue,
  ...props
}: LengthLimitedProps &
  DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >) => {
  return (
    <input
      {...props}
      onChange={(e) => {
        updateValue(e.target.value.substring(0, maxLength));
      }}
    />
  );
};

export const LengthLimitedTextarea = ({
  maxLength,
  updateValue,
  ...props
}: LengthLimitedProps &
  DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >) => {
  return (
    <textarea
      {...props}
      onChange={(e) => {
        updateValue(e.target.value.substring(0, maxLength));
      }}
    />
  );
};

interface LengthViewProps {
  maxLength: number;
  value: string;
  hideUntilWithin?: number;
}
export const LengthView = (props: LengthViewProps) => {
  if (
    props.hideUntilWithin &&
    props.maxLength - props.value.length > props.hideUntilWithin
  ) {
    return null;
  }
  return (
    <span
      css={{
        margin: 'auto 0.5em',
        color:
          props.maxLength - props.value.length > 10
            ? 'var(--default-text)'
            : 'var(--error)',
      }}
    >
      {props.value.length}/{props.maxLength}
    </span>
  );
};
