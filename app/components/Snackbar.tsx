import { createContext, ReactNode, useContext, useState } from 'react';

interface SnackbarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  message: string
  setMessage: (msg: string) => void
  fadeTimeout: ReturnType<typeof setTimeout> | null
  setFadeTimeout: (ft: ReturnType<typeof setTimeout>) => void
}

const SnackbarContext = createContext<SnackbarProps | null>(null);

export function Snackbar({
  message,
  isOpen,
}: { message: string, isOpen: boolean }) {
  return (
    <div
      css={{
        zIndex: 10000000,
        position: 'fixed',
        bottom: '1em',
        left: '1em',
        backgroundColor: 'var(--snackbar-bg)',
        color: 'var(--snackbar-text)',
        padding: '0.5em',
        borderRadius: 3,
        minHeight: 32,
        boxShadow: '0px 0px 3px 3px rgba(120,120,120,0.5)',
        opacity: 0,
        transitionProperty: 'opacity',
        transitionDuration: ANIMATION_DELAY + 'ms',
        ...(message && isOpen) && {
          opacity: 1
        }
      }}
    >{message}
    </div>
  );
}

export function SnackbarProvider(props: { children?: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [fadeTimeout, setFadeTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const contextProps = {
    isOpen,
    setIsOpen,
    message,
    setMessage,
    fadeTimeout,
    setFadeTimeout,
  };
  return (
    <SnackbarContext.Provider value={contextProps}>
      {props.children}
      <Snackbar {...contextProps} />
    </SnackbarContext.Provider>
  );
}

const DURATION = 4000;
const ANIMATION_DELAY = 250;

export function useSnackbar() {
  const context = useContext<SnackbarProps | null>(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  const nonNullContext = context;
  function openSnackbar(message: string) {
    nonNullContext.setMessage(message);
    nonNullContext.setIsOpen(true);
    nonNullContext.setFadeTimeout(
      setTimeout(
        () => {
          close();
        },
        DURATION
      )
    );
  }

  function showSnackbar(message: string) {
    if (nonNullContext.isOpen) {
      close();
      setTimeout(() => {
        openSnackbar(message);
      }, ANIMATION_DELAY);
    } else {
      openSnackbar(message);
    }
  }

  function close() {
    if (nonNullContext.fadeTimeout) {
      clearTimeout(nonNullContext.fadeTimeout);
    }
    nonNullContext.setIsOpen(false);
  }

  return showSnackbar;
}
