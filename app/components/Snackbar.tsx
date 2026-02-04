import React, {
  Dispatch,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { ANIMATION_DELAY } from '../lib/style.js';
import { clsx } from '../lib/utils.js';
import styles from './Snackbar.module.css';

enum ActionTypes {
  ShowSnackbar,
  CloseSnackbar,
  AddToast,
  RemoveToast,
}
type Action =
  | { type: ActionTypes.ShowSnackbar; message: string | ReactNode }
  | { type: ActionTypes.CloseSnackbar }
  | { type: ActionTypes.AddToast; id: number; message: string }
  | { type: ActionTypes.RemoveToast; id: number };

interface SnackbarState {
  isOpen: boolean;
  message: string | ReactNode | null;
}

interface ToastState {
  id: number;
  message: string;
}

interface State extends SnackbarState {
  toasts: ToastState[];
}

const initialState = {
  isOpen: false,
  message: null,
  toasts: [],
};

const SnackbarContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export function Snackbar({
  message,
  isOpen,
}: {
  message: string | ReactNode | null;
  isOpen: boolean;
}) {
  return (
    <div
      data-showing={message !== null && isOpen}
      className={clsx(styles.snackbar, 'reverse-theme')}
    >
      {message}
    </div>
  );
}

function Toast({ id, message }: { id: number; message: string }) {
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
    return () => {
      clearTimeout(timer);
    };
  }, [close]);

  return (
    <div data-closed={closed} className={styles.toast}>
      <div
        role="button"
        tabIndex={0}
        data-showing={message && !closing}
        className={styles.toastInner}
        onClick={close}
        onKeyDown={close}
      >
        <IoMdCloseCircleOutline className="floatRight" />
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
        id: action.id,
      });
      return { ...state };
    case ActionTypes.RemoveToast:
      return {
        ...state,
        toasts: state.toasts.filter((i) => i.id !== action.id),
      };
  }
};

export function SnackbarProvider(props: { children?: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SnackbarContext.Provider value={{ state, dispatch }}>
      {props.children}
      <Snackbar {...state} />
      <div data-empty={state.toasts.length === 0} className={styles.toastList}>
        {state.toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

const DURATION = 4000;

const toastId = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  const { dispatch } = context;
  const snackbarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSnackbar = useCallback(() => {
    if (snackbarTimeout.current) {
      clearTimeout(snackbarTimeout.current);
      snackbarTimeout.current = null;
    }
    dispatch({ type: ActionTypes.CloseSnackbar });
  }, [dispatch]);

  const openSnackbar = useCallback(
    (message: string | ReactNode, duration = DURATION) => {
      dispatch({ type: ActionTypes.ShowSnackbar, message });
      snackbarTimeout.current = setTimeout(() => {
        closeSnackbar();
      }, duration);
    },
    [closeSnackbar, dispatch]
  );

  const showSnackbar = useCallback(
    (message: string | ReactNode, duration?: number) => {
      if (context.state.isOpen) {
        closeSnackbar();
        setTimeout(() => {
          openSnackbar(message, duration);
        }, ANIMATION_DELAY);
      } else {
        openSnackbar(message, duration);
      }
    },
    [closeSnackbar, context.state.isOpen, openSnackbar]
  );

  const addToast = useCallback(
    (message: string, delay = 0) => {
      const id = toastId();
      if (delay) {
        setTimeout(() => {
          dispatch({ type: ActionTypes.AddToast, id, message });
        }, delay);
      } else {
        dispatch({ type: ActionTypes.AddToast, id, message });
      }
    },
    [dispatch]
  );

  return { showSnackbar, closeSnackbar, addToast };
}
