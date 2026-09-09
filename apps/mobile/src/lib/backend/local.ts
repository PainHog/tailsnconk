/**
 * LOCAL backend — on-device, no server. Powers dev/offline and is the default
 * until EXPO_PUBLIC_SUPABASE_* are set. Everything persists in AsyncStorage on
 * the device only; nothing is sent anywhere.
 */

import { getJSON, setJSON, removeKey, KEY } from '../store';
import type { AuthUser, Backend, CommunityPhoto, Profile, Review, SubscribeResult } from './types';

interface LocalUser {
  id: string;
  email: string;
  name: string;
}

function uid(): string {
  return 'local-' + Math.random().toString(36).slice(2, 10);
}

export class LocalBackend implements Backend {
  readonly mode = 'local' as const;

  async getUser(): Promise<AuthUser | null> {
    const u = await getJSON<LocalUser | null>(KEY.localUser, null);
    return u ? { id: u.id, email: u.email } : null;
  }

  async signIn(email: string): Promise<AuthUser> {
    const existing = await getJSON<LocalUser | null>(KEY.localUser, null);
    const user: LocalUser = existing ?? { id: uid(), email, name: email.split('@')[0] ?? 'Guest' };
    user.email = email;
    await setJSON(KEY.localUser, user);
    return { id: user.id, email: user.email };
  }

  async signUp(email: string, _password: string, name: string): Promise<AuthUser> {
    const user: LocalUser = { id: uid(), email, name: name || 'Guest' };
    await setJSON(KEY.localUser, user);
    return { id: user.id, email: user.email };
  }

  async signOut(): Promise<void> {
    await removeKey(KEY.localUser);
  }

  async getProfile(): Promise<Profile | null> {
    const u = await getJSON<LocalUser | null>(KEY.localUser, null);
    if (!u) return null;
    return { userId: u.id, name: u.name, isAdmin: false, prefs: {} };
  }

  async updateProfile(patch: Partial<Pick<Profile, 'name' | 'prefs'>>): Promise<void> {
    const u = await getJSON<LocalUser | null>(KEY.localUser, null);
    if (!u) return;
    if (patch.name) u.name = patch.name;
    await setJSON(KEY.localUser, u);
  }

  async listSaved(): Promise<string[]> {
    return getJSON<string[]>(KEY.saved, []);
  }

  async setSaved(cocktailId: string, saved: boolean): Promise<void> {
    const cur = new Set(await this.listSaved());
    saved ? cur.add(cocktailId) : cur.delete(cocktailId);
    await setJSON(KEY.saved, [...cur]);
  }

  async listMade(): Promise<string[]> {
    return getJSON<string[]>(KEY.made, []);
  }

  async setMade(cocktailId: string, made: boolean): Promise<void> {
    const cur = new Set(await this.listMade());
    made ? cur.add(cocktailId) : cur.delete(cocktailId);
    await setJSON(KEY.made, [...cur]);
  }

  async listReviews(cocktailId: string): Promise<Review[]> {
    return getJSON<Review[]>(KEY.reviews(cocktailId), []);
  }

  async submitReview(cocktailId: string, rating: number, body: string): Promise<void> {
    const u = await getJSON<LocalUser | null>(KEY.localUser, null);
    const reviews = await this.listReviews(cocktailId);
    const mine: Review = {
      userId: u?.id ?? 'anon',
      userName: u?.name ?? 'You',
      cocktailId,
      rating,
      body,
      createdAt: new Date().toISOString(),
    };
    const others = reviews.filter((r) => r.userId !== mine.userId);
    await setJSON(KEY.reviews(cocktailId), [mine, ...others]);
  }

  async subscribeEmail(): Promise<SubscribeResult> {
    return {
      ok: true,
      message: 'Local mode — no email sent. Configure Supabase + Resend to enable double opt-in.',
    };
  }

  async listApprovedPhotos(): Promise<CommunityPhoto[]> {
    return [];
  }

  async submitPhoto(): Promise<SubscribeResult> {
    return { ok: false, message: 'Photo submissions need the cloud backend configured.' };
  }

  async tonightCount(weekKey: string): Promise<number> {
    return getJSON<number>(KEY.tonight(weekKey), 0);
  }

  async joinTonight(weekKey: string): Promise<void> {
    const n = await this.tonightCount(weekKey);
    await setJSON(KEY.tonight(weekKey), n + 1);
  }
}
