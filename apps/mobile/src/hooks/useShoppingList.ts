/**
 * The user's shopping list — ingredient slugs they intend to buy. Device-local
 * (AsyncStorage), like the owned bar. "Have it" moves an item off the list; the
 * page adds it to the owned bar via useOwnedBar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getJSON, setJSON, KEY } from '@/lib/store';

export function useShoppingList() {
  const [list, setList] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getJSON<string[]>(KEY.shopping, []).then((v) => {
      setList(v);
      setReady(true);
    });
  }, []);

  const persist = useCallback((next: string[]) => {
    setList(next);
    void setJSON(KEY.shopping, next);
  }, []);

  const toggle = useCallback((slug: string) => {
    setList((prev) => {
      const s = new Set(prev);
      if (s.has(slug)) s.delete(slug);
      else s.add(slug);
      const next = [...s];
      void setJSON(KEY.shopping, next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setList((prev) => {
      const next = prev.filter((s) => s !== slug);
      void setJSON(KEY.shopping, next);
      return next;
    });
  }, []);

  /** Add several slugs at once (idempotent); returns nothing. */
  const addMany = useCallback((slugs: string[]) => {
    setList((prev) => {
      const s = new Set(prev);
      for (const x of slugs) s.add(x);
      const next = [...s];
      void setJSON(KEY.shopping, next);
      return next;
    });
  }, []);

  const listSet = useMemo(() => new Set(list), [list]);
  const has = useCallback((slug: string) => listSet.has(slug), [listSet]);
  const clear = useCallback(() => persist([]), [persist]);

  return { list, listSet, ready, toggle, remove, addMany, has, clear };
}
