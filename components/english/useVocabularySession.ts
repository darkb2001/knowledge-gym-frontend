import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { getAccessToken, getSessionVersion } from "@/lib/api-client";
import { readStoredUser } from "@/lib/auth";
import { clearVocabularySession, createVocabularySession, readVocabularySession, saveVocabularySession, type VocabularySession } from "@/lib/english-vocabulary-session";

/** Tab-local, owner-scoped metadata only. Backend identity/permissions remain authoritative. */
export function useVocabularySession() {
  const [state, setState] = useState<{ owner: string | null; session: VocabularySession; storageAvailable: boolean }>({ owner: null, session: createVocabularySession(), storageAvailable: true });
  const ownerRef = useRef<string | null>(null);
  const version = useRef(-1);
  useEffect(() => {
    const syncOwner = () => {
      const owner = readStoredUser()?.id ?? null;
      if (owner === ownerRef.current && version.current === getSessionVersion()) return;
      try { if (ownerRef.current && owner !== ownerRef.current) clearVocabularySession(ownerRef.current, window.sessionStorage); } catch { /* Storage unavailable. */ }
      ownerRef.current = owner; version.current = getSessionVersion();
      let restored = { session: createVocabularySession(), available: false };
      // Merely accessing sessionStorage can throw in privacy-restricted browsers.
      try { if (owner) restored = readVocabularySession(owner, window.sessionStorage); } catch { /* Keep memory-only state. */ }
      setState({ owner, session: restored.session, storageAvailable: restored.available });
    };
    const invalidate = (event: StorageEvent) => {
      if (event.key !== "kg.logout-intent" || event.newValue !== "1") return;
      try { if (ownerRef.current) clearVocabularySession(ownerRef.current, window.sessionStorage); } catch { /* Storage unavailable. */ }
      ownerRef.current = null; version.current = getSessionVersion();
      setState({ owner: null, session: createVocabularySession(), storageAvailable: false });
    };
    syncOwner(); window.addEventListener("kg:user-changed", syncOwner); window.addEventListener("storage", invalidate);
    return () => {
      window.removeEventListener("kg:user-changed", syncOwner); window.removeEventListener("storage", invalidate);
      // Navigation with a live session retains the snapshot; logout/revocation does not.
      try { if (ownerRef.current && !getAccessToken()) clearVocabularySession(ownerRef.current, window.sessionStorage); } catch { /* Storage unavailable. */ }
    };
  }, []);
  useEffect(() => {
    if (!state.owner || state.owner !== ownerRef.current) return;
    if (version.current !== getSessionVersion() || !getAccessToken()) {
      try { clearVocabularySession(state.owner, window.sessionStorage); } catch { /* Storage unavailable. */ }
      return;
    }
    let available = false;
    try { available = saveVocabularySession(state.owner, state.session, window.sessionStorage); } catch { /* Storage unavailable. */ }
    setState(previous => previous.storageAvailable === available ? previous : { ...previous, storageAvailable: available });
  }, [state.owner, state.session]);
  const update = useCallback((next: SetStateAction<VocabularySession>) => {
    setState(previous => ({ ...previous, session: typeof next === "function" ? next(previous.session) : next }));
  }, []);
  return { owner: state.owner, session: state.session, update, storageAvailable: state.storageAvailable };
}
