import * as React from 'react';
import { FaEye, FaCheck } from 'react-icons/fa';
import { CheatUnit, Symmetry } from './reducer';

const Square = (props: {cx:number, cy:number, beginMs:number, animate: boolean, filled: boolean}) => {
  let color = {
    fillOpacity: "0.2",
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
        values="1;0.2;1" calcMode="linear"
        repeatCount="indefinite" />
    :""}
    </rect>
  );
}

const X = (props: {cx:number, cy:number}) => {
  return (
    <>
      <line x1={props.cx - 15} x2={props.cx + 15} y1={props.cx - 15} y2={props.cx + 15} stroke="currentColor" strokeWidth="10"/>
      <line x1={props.cx - 15} x2={props.cx + 15} y1={props.cx + 15} y2={props.cx - 15} stroke="currentColor" strokeWidth="10"/>
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
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
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

export const Rebus = () => {
  return (
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <rect x="5" y="5" rx="7" ry="7" width="90" height="90" fill="transparent" stroke="currentColor" strokeWidth="10"/>
      <text x="15" y="47" fontSize="40" fontWeight="bold" textLength="70" lengthAdjust="spacingAndGlyphs">RE</text>
      <text x="15" y="82" fontSize="40" fontWeight="bold" textLength="70" lengthAdjust="spacingAndGlyphs">BUS</text>
    </svg>
  );
}

export const EscapeKey = () => {
  return (
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <rect x="5" y="12" rx="10" ry="10" width="90" height="76" fill="transparent" stroke="currentColor" strokeWidth="5"/>
      <text x="50" y="70" textAnchor="middle" fontSize="60" fontWeight="bold" lengthAdjust="spacingAndGlyphs" textLength="75">esc</text>
    </svg>
  );
}
export const BacktickKey = () => {
  return (
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <rect x="5" y="12" rx="10" ry="10" width="90" height="76" fill="transparent" stroke="currentColor" strokeWidth="5"/>
      <text x="50" y="95" textAnchor="middle" fontSize="90" fontWeight="bold" textLength="75">`</text>
    </svg>
  );
}

const CheckOrReveal = ({x, y, reveal}: {x:number, y:number, reveal: boolean}) => {
  if (reveal) {
    return <FaEye x={x} y={y} size={32} fill="currentColor" stroke="currentColor"/>;
  }
  return <FaCheck x={x} y={y} size={32} fill="currentColor" stroke="currentColor"/>;
}

const CheckReveal = ({unit, reveal}: {unit: CheatUnit, reveal: boolean}) => {
  return (
    <svg width='1em' height='1em' viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      { unit === CheatUnit.Puzzle ?
        <>
        <CheckOrReveal x={0} y={0} reveal={reveal}/>
        <CheckOrReveal x={0} y={34} reveal={reveal}/>
        <CheckOrReveal x={0} y={68} reveal={reveal}/>
        <CheckOrReveal x={68} y={0} reveal={reveal}/>
        <CheckOrReveal x={68} y={34} reveal={reveal}/>
        <CheckOrReveal x={68} y={68} reveal={reveal}/>
        </>
        :
        <>
        <Square cx={15} cy={15} beginMs={0} animate={false} filled={false}/>
        <Square cx={15} cy={85} beginMs={0} animate={false} filled={false}/>
        <Square cx={85} cy={85} beginMs={0} animate={false} filled={false}/>
        <Square cx={85} cy={15} beginMs={0} animate={false} filled={false}/>
        <Square cx={15} cy={50} beginMs={0} animate={false} filled={false}/>
        <Square cx={85} cy={50} beginMs={0} animate={false} filled={false}/>
        </>
      }
      { unit === CheatUnit.Puzzle || unit === CheatUnit.Entry ?
        <>
        <CheckOrReveal x={34} y={0} reveal={reveal}/>
        <CheckOrReveal x={34} y={68} reveal={reveal}/>
        </>
        :
        <>
        <Square cx={50} cy={15} beginMs={0} animate={false} filled={false}/>
        <Square cx={50} cy={85} beginMs={0} animate={false} filled={false}/>
        </>
      }
      <CheckOrReveal x={34} y={34} reveal={reveal}/>
    </svg>
  );
}
export const CheckSquare = () => {
  return <CheckReveal unit={CheatUnit.Square} reveal={false}/>;
}
export const CheckEntry = () => {
  return <CheckReveal unit={CheatUnit.Entry} reveal={false}/>;
}
export const CheckPuzzle = () => {
  return <CheckReveal unit={CheatUnit.Puzzle} reveal={false}/>;
}
export const RevealSquare = () => {
  return <CheckReveal unit={CheatUnit.Square} reveal={true}/>;
}
export const RevealEntry = () => {
  return <CheckReveal unit={CheatUnit.Entry} reveal={true}/>;
}
export const RevealPuzzle = () => {
  return <CheckReveal unit={CheatUnit.Puzzle} reveal={true}/>;
}

export const SymmetryIcon = ({type, ...props}: IconProps & {type: Symmetry}) => {
  return (
    <svg width={props.width || "1em"} height={props.height || "1em"} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <Square cx={15} cy={15} beginMs={0} animate={false} filled={true}/>
      <Square cx={15} cy={85} beginMs={0} animate={false} filled={type === Symmetry.Horizontal}/>
      <Square cx={85} cy={85} beginMs={0} animate={false} filled={type === Symmetry.Rotational}/>
      <Square cx={85} cy={15} beginMs={0} animate={false} filled={type === Symmetry.Vertical}/>
      <Square cx={15} cy={50} beginMs={0} animate={false} filled={type === Symmetry.Rotational || type === Symmetry.Vertical}/>
      <Square cx={85} cy={50} beginMs={0} animate={false} filled={type === Symmetry.None || type === Symmetry.Rotational || type === Symmetry.Vertical}/>
      <Square cx={50} cy={15} beginMs={0} animate={false} filled={type === Symmetry.Horizontal || type === Symmetry.None}/>
      <Square cx={50} cy={85} beginMs={0} animate={false} filled={type === Symmetry.None || type === Symmetry.Horizontal}/>
      <Square cx={50} cy={50} beginMs={0} animate={false} filled={false}/>
    </svg>
  );
}
export const SymmetryRotational = (props: IconProps) => {
  return <SymmetryIcon type={Symmetry.Rotational} {...props}/>;
}
export const SymmetryHorizontal = (props: IconProps) => {
  return <SymmetryIcon type={Symmetry.Horizontal} {...props}/>;
}
export const SymmetryVertical = (props: IconProps) => {
  return <SymmetryIcon type={Symmetry.Vertical} {...props}/>;
}
export const SymmetryNone = (props: IconProps) => {
  return <SymmetryIcon type={Symmetry.None} {...props}/>;
}

interface IconProps {
  width?: number,
  height?: number,
}
export const Logo = (props: IconProps) => {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width={props.width || "1em"} height={props.height || "1em"} viewBox="0 0 16 16"><g fill="#fff"><path d="M1 10h14v5H1z"/><path d="M3 9h10v1H3zm0-7h5v3H3z"/><path d="M6 5h1v5H6zm4-2h2v6h-2z"/><path d="M12 1h2v3h-2z"/><path d="M14 1h1v1h-1z"/></g><path d="M13 0h3v1h-3zM4 1h3v1H4z"/><path d="M12 1h1v1h-1zm3 0h1v1h-1zM3 2h1v1H3zm3 0h2v1H6z"/><path d="M11 2h1v1h-1zm3 0h1v1h-1zM2 3h1v3H2zm3 0h1v6H5z"/><path d="M7 3h1v7H7zm3 0h1v1h-1zm3 0h1v1h-1zM4 4h1v1H4z"/><path d="M9 4h1v5H9zm3 0h1v1h-1z"/><path d="M3 5h1v1H3zm8 0h1v4h-1zM4 8h1v1H4z"/><path d="M3 9h1v1H3zm5 0h1v1H8z"/><path d="M12 9h1v1h-1zM1 10h2v1H1z"/><path d="M5 10h1v1H5zm8 0h2v1h-2z"/><path d="M0 11h1v3H0zm15 0h1v3h-1zm-9 0h1v1H6z"/><path d="M4 12h2v1H4z"/><path d="M5 13h2v1H5zm4 0h2v1H9zm-8 1h3v1H1zm11 0h3v1h-3z"/><path d="M4 15h8v1H4z"/>
<rect x="10" y="10" width="1" height="1"><animate attributeName="width" dur="0.5s" id="a" begin="10;a.end+10" values="1;0" calcMode="discrete"/></rect>
<rect x="9" y="11" width="1" height="1"><animate attributeName="width" dur="0.5s" id="b" begin="10;b.end+10" values="1;3" calcMode="discrete"/></rect>
<rect x="10" y="12" width="2" height="1"><animate attributeName="width" dur="0.5s" id="c" begin="10;c.end+10" values="2;0" calcMode="discrete"/></rect></svg>
  );
}
