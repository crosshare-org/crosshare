import * as React from 'react';

const Square = (props: {cx:number, cy:number, beginMs:number, animate: boolean, filled: boolean}) => {
  let color = {
    fillOpacity: '0.2',
  };
  if (props.filled) {
    color = {
      fillOpacity: '1',
    }
  }
  return (
    <rect x={props.cx - 14} y={props.cy - 14} rx="7" ry="7" width="28" height="28" {...color}>
    {props.animate ?
      <animate attributeName="fill-opacity"
        begin={props.beginMs + "ms"} dur="1s"
        values="1;.2;1" calcMode="linear"
        repeatCount="indefinite" />
    :""}
    </rect>
  );
}

const X = (props: {cx:number, cy:number}) => {
  return (
    <>
      <line x1={props.cx - 15} x2={props.cx + 15} y1={props.cx - 15} y2={props.cx + 15} stroke="#000" stroke-width="10"/>
      <line x1={props.cx - 15} x2={props.cx + 15} y1={props.cx + 15} y2={props.cx - 15} stroke="#000" stroke-width="10"/>
    </>
  );
}

interface SpinnerProps {
  animate: boolean,
  filled: boolean,
  centerX: boolean
}

const Spinner = ({animate, filled, centerX}: SpinnerProps) => {
  let squareProps = {animate, filled};
  return (
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#000">
      <Square cx={15} cy={15} beginMs={0} {...squareProps}/>
      <Square cx={15} cy={50} beginMs={100} {...squareProps}/>
      <Square cx={50} cy={15} beginMs={300} {...squareProps}/>
      {centerX ?
        <X cx={50} cy={50}/>
      :
        <Square cx={50} cy={50} beginMs={600} {...squareProps}/>
      }
      <Square cx={85} cy={15} beginMs={800} {...squareProps}/>
      <Square cx={85} cy={50} beginMs={400} {...squareProps}/>
      <Square cx={15} cy={85} beginMs={700} {...squareProps}/>
      <Square cx={50} cy={85} beginMs={500} {...squareProps}/>
      <Square cx={85} cy={85} beginMs={200} {...squareProps}/>
    </svg>
  );
}

export const SpinnerWorking = () => {
  return <Spinner animate={true} filled={true} centerX={false}/>;
}
export const SpinnerDisabled = () => {
  return <Spinner animate={false} filled={false} centerX={false}/>;
}
export const SpinnerFailed = () => {
  return <Spinner animate={false} filled={false} centerX={true}/>;
}
export const SpinnerFinished = () => {
  return <Spinner animate={false} filled={true} centerX={false}/>;
}
