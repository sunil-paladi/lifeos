"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

const listeners = new Map<string, Set<() => void>>();
const savedValues = new Map<string, boolean>();

function subscribe(key: string, listener: () => void) {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  function handleStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) {
      if (event.key === null || event.newValue === null) {
        savedValues.delete(key);
      } else if (event.newValue === "true" || event.newValue === "false") {
        savedValues.set(key, event.newValue === "true");
      }
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    keyListeners.delete(listener);
    if (keyListeners.size === 0) {
      listeners.delete(key);
    }
    window.removeEventListener("storage", handleStorage);
  };
}

function readExpanded(key: string, defaultExpanded: boolean) {
  const savedValue = savedValues.get(key);
  if (savedValue !== undefined) {
    return savedValue;
  }

  try {
    const value = window.localStorage.getItem(key);
    if (value === "true" || value === "false") {
      const expanded = value === "true";
      savedValues.set(key, expanded);
      return expanded;
    }
    return defaultExpanded;
  } catch (error) {
    console.error("Unable to read the saved section visibility preference:", error);
    return defaultExpanded;
  }
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function usePersistentDisclosure(
  key: string,
  defaultExpanded: boolean,
) {
  const subscribeToKey = useCallback(
    (listener: () => void) => subscribe(key, listener),
    [key],
  );
  const getSnapshot = useCallback(
    () => readExpanded(key, defaultExpanded),
    [defaultExpanded, key],
  );
  const getServerSnapshot = useCallback(
    () => defaultExpanded,
    [defaultExpanded],
  );
  const expanded = useSyncExternalStore(
    subscribeToKey,
    getSnapshot,
    getServerSnapshot,
  );
  const [hydrated, setHydrated] = useState(false);
  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      savedValues.set(key, nextExpanded);
      try {
        window.localStorage.setItem(key, String(nextExpanded));
      } catch (error) {
        console.error("Unable to save the section visibility preference:", error);
      }
      notify(key);
    },
    [key],
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  return { expanded, hydrated, setExpanded };
}
