import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const STORAGE_PREFIX = 'admin-form-draft:';
const SAVED_AT_KEY = (k) => `${STORAGE_PREFIX}${k}:savedAt`;

/**
 * Form-state hook that auto-persists to localStorage so users don't lose work
 * when they switch tabs, refresh, or accidentally navigate away before saving.
 *
 * Usage:
 *   const { value, setValue, hydrateFromServer, clearDraft, hasDraft } =
 *     usePersistedForm(`package-form:${id || 'new'}`, blankForm, { editing: !!id });
 *
 * Lifecycle:
 *   1. On mount we look for a draft under `key`. If found, restore it and
 *      flag `hasDraft = true`. Auto-save becomes active immediately.
 *   2. For pages in "new" mode (`editing` is false / unspecified), auto-save
 *      is active from mount onwards.
 *   3. For pages in "edit" mode, auto-save stays **dormant** until
 *      `hydrateFromServer(serverData)` is called. This is critical — without
 *      this gate, the initial blank state would get auto-saved over a
 *      previously-saved draft before the API response landed, wiping work.
 *   4. `hydrateFromServer`:
 *        - if a draft was restored on mount, the draft wins (user was
 *          mid-edit);
 *        - otherwise the server data is applied;
 *        - either way, auto-save is enabled from this point on.
 *   5. Every change after that is debounced-saved to localStorage (~400 ms).
 *   6. After a successful API save → call `clearDraft()` so the next visit
 *      starts clean.
 */
export default function usePersistedForm(key, blankValue, options = {}) {
  const { editing = false } = options;

  const [value, setValue] = useState(blankValue);
  const [hasDraft, setHasDraft] = useState(false);

  // Refs so callbacks aren't stuck with stale closures.
  const hasDraftRef = useRef(false);
  const saveEnabledRef = useRef(false);

  // Auto-save gate. Without this guard, edit pages were silently overwriting
  // their draft with the blank initial state before the API load finished.
  const [saveEnabled, setSaveEnabled] = useState(!editing);
  if (!editing) saveEnabledRef.current = true;

  // 1) Try to restore a draft once on mount (or when the key changes).
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') {
          setValue((cur) => ({ ...cur, ...draft }));
          setHasDraft(true);
          hasDraftRef.current = true;
          // A restored draft is itself a signal that we are ready to save
          // again — even in edit mode. The page will still call
          // hydrateFromServer once the API responds, but that call will
          // preserve the draft (draft wins).
          setSaveEnabled(true);
          saveEnabledRef.current = true;
          setTimeout(() => {
            toast('Draft restored from your last edit', { icon: '💾', duration: 3000 });
          }, 250);
        }
      }
    } catch {
      // ignore parse / quota errors
    }
  }, [key]);

  // 2) Auto-save on every change, lightly debounced — but only after the
  //    hook has been told it's OK to persist.
  useEffect(() => {
    if (!saveEnabled || !key) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        localStorage.setItem(SAVED_AT_KEY(key), String(Date.now()));
      } catch {
        /* quota exhaustion: silently OK — worst case = no persistence */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value, key, saveEnabled]);

  /**
   * Apply server-fetched data — but only if no draft was restored. Either
   * way, persistence is enabled from this point.
   */
  const hydrateFromServer = useCallback((serverData) => {
    if (!key) return;
    if (!hasDraftRef.current) {
      setValue(serverData);
    }
    setSaveEnabled(true);
    saveEnabledRef.current = true;
  }, [key]);

  const clearDraft = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      localStorage.removeItem(SAVED_AT_KEY(key));
    } catch {}
    setHasDraft(false);
    hasDraftRef.current = false;
  }, [key]);

  /**
   * Discard the current draft. In edit mode the page is expected to follow
   * up with its own server reload (e.g. call `loadPkg()`); in new mode we
   * reset to the blank shape.
   */
  const discardDraft = useCallback(() => {
    clearDraft();
    if (!editing) setValue(blankValue);
    toast.success('Draft discarded');
  }, [clearDraft, blankValue, editing]);

  return {
    value,
    setValue,
    hydrateFromServer,
    clearDraft,
    discardDraft,
    hasDraft,
    saveEnabled,
  };
}
