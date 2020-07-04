import { Fragment } from 'react';

interface HistogramProps {
  data: Array<number>,
  names: Array<string>,
}

export const Histogram = (props: HistogramProps) => {
  const xSpacing = 1000 / (props.data.length);
  const maxValue = Math.max(...props.data);
  return <svg fontWeight='lighter' width="100%" viewBox="0 0 1000 300" stroke='currentColor' strokeWidth={3}>
    <line x1={0} y1={250} x2={1000} y2={250} />
    {props.data.map((value, key) =>
      <Fragment key={key}>
        {maxValue !== 0 ?
          <rect x={xSpacing / 4 + xSpacing * (key)} width={xSpacing / 2} y={50 + 200 - (value / maxValue) * 200} height={(value / maxValue) * 200} />
          : ''}
        {value ?
          <text x={xSpacing * key + xSpacing / 2} y={40 + 200 - (value / maxValue) * 200} textAnchor="middle" fontSize="20">{value.toString()}</text>
          : ''}
        <text x={xSpacing * key + xSpacing / 2} y="295" textAnchor="middle" fontSize="40">{props.names[key]}</text>
      </Fragment>
    )}
  </svg>;
};
