/**
 * CLOUD backend — Supabase (auth, Postgres with RLS, Storage, Edge Functions).
 * Selected automatically when EXPO_PUBLIC_SUPABASE_* are present. Talks to the
 * tables/views/functions defined in supabase/migrations.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { periodKey } from '@tailsnconk/core';

import { PUBLIC_CONFIG } from './public-config';
import type { AuthUser, Backend, CommunityPhoto, Profile, Review, SubscribeResult } from './types';

export class SupabaseBackend implements Backend {
  readonly mode = 'cloud' as const;
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(PUBLIC_CONFIG.url, PUBLIC_CONFIG.anonKey, {
      auth: {
        storage: AsyncStorage as unknown as Storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  private async requireUserId(): Promise<string> {
    const { data } = await this.client.auth.getUser();
    if (!data.user) throw new Error('Not signed in');
    return data.user.id;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error ?? new Error('Sign-in failed');
    return { id: data.user.id, email: data.user.email ?? undefined };
  }

  async signUp(email: string, password: string, name: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) throw error ?? new Error('Sign-up failed');
    // The on_auth_user_created DB trigger creates the profile row, even when
    // email confirmation leaves us without a session. This is only a fallback
    // when we do have one; it never overwrites an existing row.
    if (data.session) {
      await this.client
        .from('profiles')
        .upsert({ user_id: data.user.id, name }, { onConflict: 'user_id', ignoreDuplicates: true });
    }
    return { id: data.user.id, email: data.user.email ?? undefined };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getProfile(): Promise<Profile | null> {
    const { data: userData } = await this.client.auth.getUser();
    if (!userData.user) return null;
    const { data } = await this.client
      .from('profiles')
      .select('user_id, name, is_admin, prefs')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!data) return { userId: userData.user.id, name: '', isAdmin: false, prefs: {} };
    return {
      userId: data.user_id,
      name: data.name ?? '',
      isAdmin: Boolean(data.is_admin),
      prefs: (data.prefs as Record<string, unknown>) ?? {},
    };
  }

  async updateProfile(patch: Partial<Pick<Profile, 'name' | 'prefs'>>): Promise<void> {
    const userId = await this.requireUserId();
    await this.client.from('profiles').update(patch).eq('user_id', userId);
  }

  async listSaved(): Promise<string[]> {
    const { data } = await this.client.from('saved_cocktails').select('cocktail_id');
    return (data ?? []).map((r) => r.cocktail_id as string);
  }

  async setSaved(cocktailId: string, saved: boolean): Promise<void> {
    const userId = await this.requireUserId();
    if (saved) {
      await this.client.from('saved_cocktails').upsert(
        { user_id: userId, cocktail_id: cocktailId },
        { onConflict: 'user_id,cocktail_id' },
      );
    } else {
      await this.client.from('saved_cocktails').delete().eq('user_id', userId).eq('cocktail_id', cocktailId);
    }
  }

  async listMade(): Promise<string[]> {
    const { data } = await this.client.from('made_cocktails').select('cocktail_id');
    return (data ?? []).map((r) => r.cocktail_id as string);
  }

  async setMade(cocktailId: string, made: boolean): Promise<void> {
    const userId = await this.requireUserId();
    if (made) {
      await this.client.from('made_cocktails').upsert(
        { user_id: userId, cocktail_id: cocktailId },
        { onConflict: 'user_id,cocktail_id' },
      );
    } else {
      await this.client.from('made_cocktails').delete().eq('user_id', userId).eq('cocktail_id', cocktailId);
    }
  }

  async listReviews(cocktailId: string): Promise<Review[]> {
    // public_reviews is a definer view (see migration 3) that joins reviews with
    // the author's public name and is anon-readable for ALL rows — the reviews
    // table itself only exposes the caller's own rows, so we must not query it.
    const { data, error } = await this.client
      .from('public_reviews')
      .select('id, user_id, cocktail_id, rating, body, created_at, name')
      .eq('cocktail_id', cocktailId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      userName: (r.name as string) ?? 'Guest',
      cocktailId: r.cocktail_id as string,
      rating: r.rating as number,
      body: (r.body as string) ?? '',
      createdAt: r.created_at as string,
    }));
  }

  async submitReview(cocktailId: string, rating: number, body: string): Promise<void> {
    const userId = await this.requireUserId();
    await this.client.from('reviews').upsert(
      { user_id: userId, cocktail_id: cocktailId, rating, body },
      { onConflict: 'user_id,cocktail_id' },
    );
  }

  async subscribeEmail(email: string, source: string): Promise<SubscribeResult> {
    const { error } = await this.client.functions.invoke('newsletter-subscribe', {
      body: { email, source },
    });
    if (error) return { ok: false, message: 'Could not subscribe right now. Please try again.' };
    return { ok: true, message: 'Check your inbox to confirm your subscription.' };
  }

  async listApprovedPhotos(cocktailId: string): Promise<CommunityPhoto[]> {
    // wall-photos returns snake_case keys; map them to the CommunityPhoto shape.
    const { data, error } = await this.client.functions.invoke('wall-photos', {
      body: { cocktail_id: cocktailId },
    });
    if (error || !data) return [];
    const rows = (data.photos ?? []) as Array<Record<string, unknown>>;
    return rows.map((p) => ({
      id: (p.id as string) ?? '',
      cocktailId: (p.cocktail_id as string) ?? (p.cocktailId as string) ?? cocktailId,
      userName: (p.user_name as string) ?? (p.userName as string) ?? 'Guest',
      url: (p.url as string) ?? '',
      caption: (p.caption as string) ?? '',
    }));
  }

  async submitPhoto(cocktailId: string, dataUrl: string, caption: string): Promise<SubscribeResult> {
    const userId = await this.requireUserId();
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${userId}/${cocktailId}-${Date.now()}.jpg`;
    const up = await this.client.storage.from('made-photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (up.error) return { ok: false, message: 'Upload failed.' };
    // user_id and week_key are NOT NULL; the enforce_made_photo_insert trigger
    // also requires user_id === auth.uid() and forces status='pending'.
    const ins = await this.client
      .from('made_photos')
      .insert({ user_id: userId, week_key: periodKey(), cocktail_id: cocktailId, storage_path: path, caption });
    if (ins.error) return { ok: false, message: 'Could not submit photo.' };
    return { ok: true, message: 'Submitted for review — thanks!' };
  }

  async tonightCount(weekKey: string): Promise<number> {
    const { data } = await this.client
      .from('tonight_making_counts')
      .select('count')
      .eq('week_key', weekKey)
      .maybeSingle();
    return (data?.count as number) ?? 0;
  }

  async joinTonight(weekKey: string): Promise<void> {
    const userId = await this.requireUserId();
    await this.client.from('tonight_making').upsert(
      { week_key: weekKey, user_id: userId },
      { onConflict: 'week_key,user_id' },
    );
  }
}
