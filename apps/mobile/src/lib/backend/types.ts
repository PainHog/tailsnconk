/**
 * THE BACKEND SEAM (blueprint §5.0) — the reuse keystone.
 *
 * The app talks ONLY to this `Backend` interface. Two implementations satisfy
 * it: `local.ts` (on-device AsyncStorage; no server — dev/offline) and
 * `supabase.ts` (cloud). `index.ts` picks cloud when EXPO_PUBLIC_SUPABASE_* are
 * present, else local. Launch is a config change, not a code change.
 */

export interface AuthUser {
  id: string;
  email?: string;
}

export interface Profile {
  userId: string;
  name: string;
  isAdmin: boolean;
  prefs: Record<string, unknown>;
}

export interface Review {
  id?: string;
  userId: string;
  userName?: string;
  cocktailId: string;
  rating: number;
  body: string;
  createdAt?: string;
}

export interface CommunityPhoto {
  id: string;
  cocktailId: string;
  userName: string;
  url: string;
  caption: string;
}

export interface SubscribeResult {
  ok: boolean;
  message: string;
}

export interface Backend {
  readonly mode: 'local' | 'cloud';

  // --- Auth ---
  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(email: string, password: string, name: string): Promise<AuthUser>;
  signOut(): Promise<void>;

  // --- Profile ---
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Pick<Profile, 'name' | 'prefs'>>): Promise<void>;

  // --- Saved collection ("save this cocktail") ---
  listSaved(): Promise<string[]>;
  setSaved(cocktailId: string, saved: boolean): Promise<void>;

  // --- Made / passport (retention) ---
  listMade(): Promise<string[]>;
  setMade(cocktailId: string, made: boolean): Promise<void>;

  // --- Reviews (comments + ratings) ---
  listReviews(cocktailId: string): Promise<Review[]>;
  submitReview(cocktailId: string, rating: number, body: string): Promise<void>;

  // --- Newsletter (double opt-in; the server sends the confirm email) ---
  subscribeEmail(email: string, source: string): Promise<SubscribeResult>;

  // --- Community photos (moderated) ---
  listApprovedPhotos(cocktailId: string): Promise<CommunityPhoto[]>;
  submitPhoto(cocktailId: string, dataUrl: string, caption: string): Promise<SubscribeResult>;

  // --- Communal "making it tonight" counter ---
  tonightCount(weekKey: string): Promise<number>;
  joinTonight(weekKey: string): Promise<void>;
}
