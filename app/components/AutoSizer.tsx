import { PureComponent, ReactNode, CSSProperties } from 'react';
import createDetectElementResize from '../vendor/detectElementResize';

declare global {
  interface Window {
    HTMLElement: typeof HTMLElement;
  }
}

interface Size {
  height: number,
  width: number,
}

interface Props {
  /** Function responsible for rendering children. */
  children: (size: Size) => ReactNode;
}

interface State {
  height: number,
  width: number,
}

type ResizeHandler = (element: HTMLElement, onResize: () => void) => void;

interface DetectElementResize {
  addResizeListener: ResizeHandler,
  removeResizeListener: ResizeHandler,
}

export default class AutoSizer extends PureComponent<Props, State> {
  static defaultProps = {
    onResize: (): void => { /* noop */ },
    disableHeight: false,
    disableWidth: false,
    style: {},
  };

  state = {
    height: 0,
    width: 0,
  };

  _parentNode?: HTMLElement;
  _autoSizer?: HTMLElement;
  _detectElementResize?: DetectElementResize;

  componentDidMount(): void {
    if (
      this._autoSizer &&
      this._autoSizer.parentNode &&
      this._autoSizer.parentNode.ownerDocument &&
      this._autoSizer.parentNode.ownerDocument.defaultView &&
      this._autoSizer.parentNode instanceof
      this._autoSizer.parentNode.ownerDocument.defaultView.HTMLElement
    ) {
      // Delay access of parentNode until mount.
      // This handles edge-cases where the component has already been unmounted before its ref has been set,
      // As well as libraries like react-lite which have a slightly different lifecycle.
      this._parentNode = this._autoSizer.parentNode;

      // Defer requiring resize handler in order to support server-side rendering.
      // See issue #41
      this._detectElementResize = createDetectElementResize(null);
      if (this._parentNode) {
        this._detectElementResize.addResizeListener(
          this._parentNode,
          this._onResize,
        );
      }

      this._onResize();
    }
  }

  componentWillUnmount(): void {
    if (this._detectElementResize && this._parentNode) {
      this._detectElementResize.removeResizeListener(
        this._parentNode,
        this._onResize,
      );
    }
  }

  render(): JSX.Element {
    const { height, width } = this.state;

    // Outer div should not force width/height since that may prevent containers from shrinking.
    // Inner component should overflow and use calculated width/height.
    // See issue #68 for more information.
    const outerStyle: CSSProperties = { width: 0, height: 0, overflow: 'visible' };
    const childParams: Size = { width: width, height: height };

    return (
      <div
        ref={this._setRef}
        style={{
          ...outerStyle,
        }}>
        {width !== 0 && height !== 0 && this.props.children(childParams)}
      </div>
    );
  }

  _onResize = (): void => {
    if (this._parentNode) {
      // Guard against AutoSizer component being removed from the DOM immediately after being added.
      // This can result in invalid style values which can result in NaN values if we don't handle them.
      // See issue #150 for more context.

      const height = this._parentNode.offsetHeight || 0;
      const width = this._parentNode.offsetWidth || 0;

      const style = window.getComputedStyle(this._parentNode) || {};
      const paddingLeft = parseInt(style.paddingLeft, 10) || 0;
      const paddingRight = parseInt(style.paddingRight, 10) || 0;
      const paddingTop = parseInt(style.paddingTop, 10) || 0;
      const paddingBottom = parseInt(style.paddingBottom, 10) || 0;

      const newHeight = height - paddingTop - paddingBottom;
      const newWidth = width - paddingLeft - paddingRight;

      if (
        (this.state.height !== newHeight) ||
        (this.state.width !== newWidth)
      ) {
        this.setState({
          height: newHeight,
          width: newWidth,
        });
      }
    }
  };

  _setRef = (autoSizer: HTMLDivElement): void => {
    this._autoSizer = autoSizer;
  };
}
