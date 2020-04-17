type ResizeHandler = (element: HTMLElement, onResize: () => void) => void;

interface DetectElementResize {
  addResizeListener: ResizeHandler,
  removeResizeListener: ResizeHandler,
};

export default function createDetectElementResize(nonce: string|null): DetectElementResize
