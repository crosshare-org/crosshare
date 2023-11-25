import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  MouseEvent,
  RefObject,
} from 'react';
import { ConstructorPageT } from './constructorPage';
import useResizeObserver from 'use-resize-observer';
import type { User } from 'firebase/auth';
import { LINK, PRIMARY } from './style';
import { parseToRgba } from 'color2k';
import { EmbedOptionsT } from './embedOptions';
import useEventListener from '@use-it/event-listener';
import { EmbedColorMode, EmbedContextValue } from '../components/EmbedContext';
import { EmbedStylingProps } from '../components/EmbedStyling';
import { logAsyncErrors } from './utils';

// pass a query like `(min-width: 768px)`
export function useMatchMedia(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQueryList = matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // note 1: safari currently doesn't support add/removeEventListener so we use add/removeListener
    // note 2: add/removeListener are maybe marked as deprecated, but that could be wrong
    //         see https://github.com/microsoft/TypeScript/issues/32210
    mediaQueryList.addListener(onChange);
    return () => {
      mediaQueryList.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

export function usePolyfilledResizeObserver(ref: RefObject<HTMLElement>) {
  const [hasResizeObserver, setHasResizeObserver] = useState(false);
  useEffect(() => {
    let didCancel = false;

    const loadRO = async () => {
      if (hasResizeObserver) {
        return;
      }
      if ('ResizeObserver' in window) {
        setHasResizeObserver(true);
      } else {
        // Loads polyfill asynchronously, only if required.
        return import('@juggle/resize-observer').then((module) => {
          window.ResizeObserver =
            module.ResizeObserver as unknown as typeof ResizeObserver;
          if (!didCancel) {
            setHasResizeObserver(true);
          }
        });
      }
    };
    logAsyncErrors(loadRO)();
    return () => {
      didCancel = true;
    };
  }, [hasResizeObserver]);
  return useResizeObserver({ ref: hasResizeObserver ? ref : null });
}

/*
  This hook is used to determine if the browser is in dark mode
*/
export function useIsExistingDarkMode(): boolean {
  return useMatchMedia('(prefers-color-scheme: dark)');
}

type DarkModePreference = 'dark' | 'light' | null;
const darkModeKey = 'colorScheme';
const darkClass = 'dark-mode';
const lightClass = 'light-mode';
export function useDarkModeControl(): [
  DarkModePreference,
  (preference: DarkModePreference) => void
] {
  const [pref, setPref] = useState<DarkModePreference>(null);

  useEffect(() => {
    try {
      const initialValue = localStorage.getItem(darkModeKey);
      if (initialValue !== null) {
        setPref(initialValue === 'dark' ? 'dark' : 'light');
      }
    } catch {
      /* happens on incognito when iframed */
      console.warn('not loading setting from LS');
    }
  }, []);

  const setPrefAndPersist = useCallback((newVal: DarkModePreference) => {
    try {
      if (newVal === null) {
        localStorage.removeItem(darkModeKey);
      } else {
        localStorage.setItem(darkModeKey, newVal);
      }
    } catch {
      console.warn('failed to store setting in LS');
    }
    setPref(newVal);
    if (newVal !== 'dark') {
      document.body.classList.remove(darkClass);
    }
    if (newVal !== 'light') {
      document.body.classList.remove(lightClass);
    }
    if (newVal === 'dark') {
      document.body.classList.add(darkClass);
    }
    if (newVal === 'light') {
      document.body.classList.add(lightClass);
    }
  }, []);

  return [pref, setPrefAndPersist];
}

export function usePersistedBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (b: boolean) => void] {
  const [state, setState] = useState<boolean>(defaultValue);

  const setStateAndPersist = useCallback(
    (newValue: boolean) => {
      try {
        localStorage.setItem(key, newValue ? 'true' : 'false');
      } catch {
        console.warn('failed to store setting in LS');
      }
      setState(newValue);
    },
    [key, setState]
  );

  useEffect(() => {
    try {
      const initialValue = localStorage.getItem(key);
      setState(initialValue !== null ? initialValue === 'true' : defaultValue);
    } catch {
      /* happens on incognito when iframed */
      console.warn('not loading setting from LS');
    }
  }, [defaultValue, key, setStateAndPersist]);

  return [state, setStateAndPersist];
}

export const getDisplayName = (
  user: User | undefined,
  constructorPage: ConstructorPageT | undefined
) => {
  return constructorPage?.n || user?.displayName || null;
};

export function useHover(): [
  boolean,
  {
    onClick: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseLeave: (e: MouseEvent) => void;
  },
  () => void
] {
  const [isHovered, setHovered] = useState(false);
  const [clickWhileHovered, setClickWhileHovered] = useState(false);

  const bind = useMemo(
    () => ({
      onClick: (e: MouseEvent) => {
        if (clickWhileHovered) {
          setHovered(false);
          setClickWhileHovered(false);
        }
        e.stopPropagation();
      },
      onMouseMove: () => {
        if (isHovered) {
          setClickWhileHovered(true);
        }
        setHovered(true);
      },
      onMouseLeave: () => {
        setHovered(false);
      },
    }),
    [isHovered, clickWhileHovered]
  );

  return [
    isHovered,
    bind,
    () => {
      setHovered(false);
    },
  ];
}

export function useEmbedOptions(
  embedOptions: EmbedOptionsT | undefined
): [EmbedStylingProps, EmbedContextValue] {
  /** TODO use a validator instead */
  interface Message {
    type: string;
    value: string;
  }

  let primary = PRIMARY;
  let link = LINK;
  let preservePrimary = false;

  const [colorMode, setColorMode] = useState<EmbedColorMode>(
    embedOptions?.d ? EmbedColorMode.Dark : EmbedColorMode.Light
  );
  const embedContext: EmbedContextValue = {
    isEmbed: true,
    colorMode,
    isSlate: embedOptions?.slate || false,
  };

  const darkMode = embedContext.colorMode === EmbedColorMode.Dark;

  primary = embedOptions?.p || PRIMARY;
  link = embedOptions?.l || LINK;
  preservePrimary = embedOptions?.pp || false;
  // Just ensure color is parseable, this'll throw if not:
  parseToRgba(primary);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const message: Message = e.data;

      if (message.type === 'set-color-mode') {
        setColorMode(
          message.value === 'dark' ? EmbedColorMode.Dark : EmbedColorMode.Light
        );
      }
    },
    [setColorMode]
  );
  useEventListener('message', handleMessage);

  return [
    {
      primary,
      link,
      darkMode,
      preservePrimary,
      ...(embedOptions?.fu && { fontUrl: embedOptions.fu }),
      ...(embedOptions?.fu &&
        embedOptions.fub && { fontUrlBold: embedOptions.fub }),
      ...(embedOptions?.fu &&
        embedOptions.fui && { fontUrlItalic: embedOptions.fui }),
      ...(embedOptions?.fu &&
        embedOptions.fubi && { fontUrlBoldItalic: embedOptions.fubi }),
    },
    embedContext,
  ];
}
