import * as React from 'react';

export enum SpinnerState {
  Disabled,
  Working,
  Finished,
  Failed
}

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
    <rect x={props.cx - 15} y={props.cy - 15} rx="7" ry="7" width="30" height="30" {...color}>
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
  state: SpinnerState,
  size: number
}

export const Spinner = (props: SpinnerProps) => {
  let squareProps = {
    animate: props.state === SpinnerState.Working,
    filled: props.state !== SpinnerState.Disabled && props.state !== SpinnerState.Failed,
  }
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#000">
      <Square cx={15} cy={15} beginMs={0} {...squareProps}/>
      <Square cx={15} cy={50} beginMs={100} {...squareProps}/>
      <Square cx={50} cy={15} beginMs={300} {...squareProps}/>
      {props.state === SpinnerState.Failed ?
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
