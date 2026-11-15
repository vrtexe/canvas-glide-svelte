import localforage from 'localforage';

/**
 * Persisted blob state (IndexedDB via localforage). Call during component
 * init. `current` is reactive; `set` updates state and persists.
 */
export function createLocalStorageBlob<T extends Blob | null>(key: string, initialValue: T) {
  let value = $state<T>(initialValue);

  localforage
    .getItem<T>(key)
    .then((item) => {
      if (item !== null) value = item;
    })
    .catch((error) => console.error(error));

  return {
    get current() {
      return value;
    },
    set(next: T) {
      value = next;
      localforage.setItem(key, next).catch((error) => console.error(error));
    },
  };
}
