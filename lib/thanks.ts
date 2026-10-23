/** How long a thank-you from the small model may delay nothing. The scripted line is already on screen. */
export const THANKS_TIMEOUT_MS = 3_000;

/**
 * The conversation does not wait on the model. If the model is slow, missing,
 * or still downloading, this resolves to null and the scripted line stands.
 */
export function thanksWithin(work: Promise<string | null>, ms = THANKS_TIMEOUT_MS): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), ms);
    work.then(
      (value) => finish(value),
      () => finish(null),
    );
  });
}
