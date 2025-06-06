import useEventListener from '@use-it/event-listener';
import { parseToRgba } from 'color2k';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import {
  EmbedColorMode,
  EmbedContextValue,
} from '../components/EmbedContext.js';
import { EmbedStylingProps } from '../components/EmbedStyling.js';
import { ConstructorPageT } from './constructorPage.js';
import { EmbedOptionsT } from './embedOptions.js';
import { ERROR_COLOR, LINK, PRIMARY, VERIFIED_COLOR } from './style.js';

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
    mediaQueryList.addEventListener('change', onChange);
    return () => {
      mediaQueryList.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}

export const useSize = (target: React.RefObject<HTMLDivElement | null>) => {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const updateSize = useCallback(() => {
    if (target.current) {
      const size = target.current.getBoundingClientRect();

      setSize(size);
    }
  }, [target]);

  useEffect(() => {
    const { current } = target;

    updateSize();

    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        updateSize();
      }
    });

    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
      observer.disconnect();
    };
  }, [target, updateSize]);

  return size;
};

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
  (preference: DarkModePreference) => void,
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

export function useEmbedOptions(
  embedOptions: EmbedOptionsT | undefined
): [EmbedStylingProps, EmbedContextValue] {
  /** TODO use a validator instead */
  interface Message {
    type: string;
    value: string;
  }

  const primary = embedOptions?.p || PRIMARY;
  const link = embedOptions?.l || LINK;
  const preservePrimary = embedOptions?.pp || false;
  const errorColor = embedOptions?.e || ERROR_COLOR;
  const verifiedColor = embedOptions?.v || VERIFIED_COLOR;

  const [colorMode, setColorMode] = useState<EmbedColorMode>(
    embedOptions?.d ? EmbedColorMode.Dark : EmbedColorMode.Light
  );
  const embedContext: EmbedContextValue = {
    primaryColor: primary,
    preservePrimary,
    isEmbed: true,
    colorMode,
    isSlate: embedOptions?.slate || false,
  };

  const darkMode = embedContext.colorMode === EmbedColorMode.Dark;

  // Just ensure color is parseable, this'll throw if not:
  parseToRgba(primary);
  parseToRgba(link);
  parseToRgba(errorColor);
  parseToRgba(verifiedColor);

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
      errorColor,
      verifiedColor,
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
