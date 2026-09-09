/**
 * The user's owned-bottles bar — the input to the PRIMARY tool. Device-local
 * (AsyncStorage) so the whole "what can I make" experience works with no
 * account and no backend.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getJSON, setJSON, KEY } from '@/lib/store';

export function useOwnedBar() {
  const [owned, setOwned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getJSON<string[]>(KEY.ownedBar, []).then((v) => {
      setOwned(v);
      setReady(true);
    });
  }, []);

  const persist = useCallback((next: string[]) => {
    setOwned(next);
    void setJSON(KEY.ownedBar, next);
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      setOwned((prev) => {
        const s = new Set(prev);
        if (s.has(slug)) s.delete(slug);
        else s.add(slug);
        const next = [...s];
        void setJSON(KEY.ownedBar, next);
        return next;
      });
    },
    [],
  );

  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const has = useCallback((slug: string) => ownedSet.has(slug), [ownedSet]);
  const clear = useCallback(() => persist([]), [persist]);
  const setAll = useCallback((slugs: string[]) => persist(slugs), [persist]);

  return { owned, ownedSet, ready, toggle, has, clear, setAll };
}
