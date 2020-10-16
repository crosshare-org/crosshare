import { IoMdCloseCircleOutline, } from 'react-icons/io';
import { createContext, Dispatch, ReactNode, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { SMALL_AND_UP } from '../lib/style';
import { keyframes } from '@emotion/core';

const slidein = keyframes`
from {
  margin-left: 100%;
}

to {
  margin-left: 0%;
}
`;

enum ActionTypes {
  ShowSnackbar,
  CloseSnackbar,
  AddToast,
  RemoveToast,
}
type Action =
  | { type: ActionTypes.ShowSnackbar, message: string }
  | { type: ActionTypes.CloseSnackbar }
  | { type: ActionTypes.AddToast, id: number, message: string }
  | { type: ActionTypes.RemoveToast, id: number };

interface SnackbarState {
  isOpen: boolean,
  message: string,
}

interface ToastState {
  id: number,
  message: string,
}

interface State extends SnackbarState {
  toasts: Array<ToastState>
}

const initialState = {
  isOpen: false,
  message: '',
  toasts: []
};

const SnackbarContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null
});

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
        visibility: 'hidden',
        transition: 'all ' + ANIMATION_DELAY + 'ms ease-in-out 0s',
        ...(message && isOpen) && {
          opacity: 1,
          visibility: 'visible'
        }
      }}
    >{message}
    </div>
  );
}

function Toast({ id, message }: { id: number, message: string }) {
  const { dispatch } = useContext(SnackbarContext);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  const close = useCallback(() => {
    // Close the toast which causes it to slide right
    setClosing(true);

    // After slide right we set closing which causes it to shrink vertically
    setTimeout(() => {
      setClosed(true);
    }, ANIMATION_DELAY);

    // After shrink vertically we remove the toast
    setTimeout(() => {
      dispatch({ type: ActionTypes.RemoveToast, id });
    }, 2 * ANIMATION_DELAY);
  }, [dispatch, id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      close();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [close]);

  return (
    <div css={{
      transition: 'all ' + ANIMATION_DELAY + 'ms ease-in-out 0s',
      maxHeight: 500,
      ...closed && { maxHeight: 0 },
      [SMALL_AND_UP]: {
        '& + &': {
          marginTop: '1em',
        }
      }
    }}>
      <div
        role="button"
        tabIndex={0}
        css={{
          cursor: 'pointer',
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          padding: '1em',
          width: '100%',
          marginLeft: '110%',
          boxShadow: '0px 0px 3px 3px rgba(120,120,120,0.5)',
          animation: `${slidein} 0.3s ease-in-out`,
          transition: 'all ' + ANIMATION_DELAY + 'ms ease-in-out 0s',
          ...(message && !closing) && {
            marginLeft: 0,
          },
        }}
        onClick={close}
        onKeyPress={close}
      >
        <IoMdCloseCircleOutline css={{
          float: 'right',
        }} />
        {message}
      </div>
    </div>
  );
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
  case ActionTypes.ShowSnackbar:
    return {
      ...state,
      isOpen: true,
      message: action.message,
    };
  case ActionTypes.CloseSnackbar:
    return {
      ...state,
      isOpen: false,
    };
  case ActionTypes.AddToast:
    state.toasts.push({
      message: action.message,
      id: action.id
    });
    return { ...state };
  case ActionTypes.RemoveToast:
    return {
      ...state,
      toasts: state.toasts.filter(i => i.id !== action.id),
    };
  }
};

export function SnackbarProvider(props: { children?: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SnackbarContext.Provider value={{ state, dispatch }}>
      {props.children}
      <Snackbar {...state} />
      <div css={{
        zIndex: 10000000,
        position: 'fixed',
        overflow: 'hidden',
        width: '100vw',
        paddingBottom: 4,
        top: 0,
        right: 0,
        ...(state.toasts.length === 0) && { display: 'none' },
        [SMALL_AND_UP]: {
          padding: 4,
          top: '1em',
          right: '1em',
          width: 320
        }
      }}>
        {state.toasts.map(t => <Toast key={t.id} {...t} />)}
      </div>
    </SnackbarContext.Provider>
  );
}

const DURATION = 4000;
const ANIMATION_DELAY = 250;

const toastId = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  const [snackbarTimeout, setSnackbarTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  function openSnackbar(message: string) {
    context.dispatch({ type: ActionTypes.ShowSnackbar, message });
    setSnackbarTimeout(
      setTimeout(
        () => {
          close();
        },
        DURATION
      )
    );
  }

  function showSnackbar(message: string) {
    if (context.state.isOpen) {
      close();
      setTimeout(() => {
        openSnackbar(message);
      }, ANIMATION_DELAY);
    } else {
      openSnackbar(message);
    }
  }

  function close() {
    if (snackbarTimeout) {
      clearTimeout(snackbarTimeout);
      setSnackbarTimeout(null);
    }
    context.dispatch({ type: ActionTypes.CloseSnackbar });
  }

  function addToast(message: string, delay = 0) {
    const id = toastId();
    if (delay) {
      setTimeout(() => {
        context.dispatch({ type: ActionTypes.AddToast, id, message });
      }, delay);
    } else {
      context.dispatch({ type: ActionTypes.AddToast, id, message });
    }
  }

  return { showSnackbar, addToast };
}
