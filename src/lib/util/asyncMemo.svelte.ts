/**
 * Async-derived value tied to the reactive values `asyncFn` reads
 * synchronously (e.g. a destructured prop). Call during component init.
 *
 * `dispose` releases a produced value when it is replaced, destroyed, or
 * arrives after its generation was superseded (e.g. `(bitmap) => bitmap.close()`).
 * Each generation only ever disposes the value IT produced — never a newer
 * generation's. A rejected `asyncFn` resolves the value to null instead of
 * leaking an unhandled rejection.
 */
export function createAsyncMemo<T>(asyncFn: () => Promise<T>, dispose?: (value: T) => void) {
  let value = $state<T | null>(null);

  $effect(() => {
    let current = true;
    let produced: T | null = null;

    asyncFn()
      .then((result) => {
        produced = result;
        if (current) {
          value = result;
        } else if (result) {
          // Resolved after this generation was replaced/destroyed.
          dispose?.(result);
          produced = null;
        }
      })
      .catch(() => {
        if (current) value = null;
      });

    return () => {
      current = false;
      if (produced) {
        dispose?.(produced);
        produced = null;
      }
      value = null;
    };
  });

  return {
    get current() {
      return value;
    },
  };
}
