import { adjustHue, guard, parseToRgba } from 'color2k';
import { ChangeEvent, useCallback, useState } from 'react';
import styles from './ColorPicker.module.css';

interface SwatchProps {
  color: string;
  selected: string;
  select: () => void;
}
const Swatch = (props: SwatchProps) => {
  const isSelected = props.color === props.selected;
  return (
    <div
      style={{ backgroundColor: props.color }}
      data-selected={isSelected}
      role="button"
      tabIndex={0}
      className={styles.swatch}
      onClick={props.select}
      onKeyDown={props.select}
    />
  );
};

const NUMSWATCHES = 36;

const toHex = (n: number) => guard(0, 255, n).toString(16).padStart(2, '0');
const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + toHex(r) + toHex(g) + toHex(b);
};

interface ColorPickerProps {
  initial: string;
  swatchBase: string;
  onChange: (newColor: string) => void;
  hideCustom?: boolean;
}
export const ColorPicker = (props: ColorPickerProps) => {
  const [current, setCurrent] = useState(props.initial);
  const [r, g, b] = parseToRgba(props.initial);
  const [hexColor, setHexColor] = useState(rgbToHex(r, g, b));

  const updateHexColor = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setHexColor(newColor);
      try {
        const [r, g, b] = parseToRgba(newColor);
        const color = rgbToHex(r, g, b);
        setCurrent(color);
        props.onChange(color);
      } catch {
        /* noop */
      }
    },
    [props]
  );

  const swatches = [];
  for (let i = 0; i < NUMSWATCHES; i += 1) {
    const color = adjustHue(props.swatchBase, (i * 360) / NUMSWATCHES);
    swatches.push(
      <Swatch
        key={i}
        color={color}
        select={() => {
          setCurrent(color);
          props.onChange(color);
          const [r, g, b] = parseToRgba(color);
          setHexColor(rgbToHex(r, g, b));
        }}
        selected={current}
      />
    );
  }

  return (
    <div className="marginBottom1em">
      {swatches}
      {props.hideCustom ? (
        ''
      ) : (
        <div>
          <input type="text" value={hexColor} onChange={updateHexColor} />
        </div>
      )}
    </div>
  );
};
