/**
 * Current auth user + profile, via the backend seam. Works in both local and
 * cloud modes.
 */
import { useCallback, useEffect, useState } from 'react';
import { backend } from '@/lib/backend';
import type { AuthUser, Profile } from '@/lib/backend/types';

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const b = backend();
    const u = await b.getUser();
    setUser(u);
    setProfile(u ? await b.getProfile() : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, profile, loading, refresh, mode: backend().mode };
}
