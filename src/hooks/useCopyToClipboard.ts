import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the "Copied" confirmation stays up. */
const FEEDBACK_MS = 1_800;

interface UseCopyToClipboard {
  /** Key of the field copied most recently, or `null`. Drives per-row feedback. */
  copiedKey: string | null;
  copy: (value: string, key: string) => Promise<boolean>;
}

/**
 * Clipboard writes with transient per-field confirmation.
 *
 * Falls back to a hidden `<textarea>` and `execCommand` because
 * `navigator.clipboard` is unavailable on any page not served over HTTPS or
 * localhost — including an admin console reached over a LAN IP, which is exactly
 * how this one gets used during a field deployment.
 */
export function useCopyToClipboard(): UseCopyToClipboard {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // A copy immediately before unmount would otherwise set state on a dead component.
  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const flash = useCallback((key: string): void => {
    setCopiedKey(key);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopiedKey(null), FEEDBACK_MS);
  }, []);

  const copy = useCallback(
    async (value: string, key: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          flash(key);
          return true;
        }

        const textarea = document.createElement('textarea');
        textarea.value = value;
        // Off-screen rather than `display: none`: a hidden element cannot be selected.
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();

        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) flash(key);
        return ok;
      } catch {
        return false;
      }
    },
    [flash],
  );

  return { copiedKey, copy };
}
