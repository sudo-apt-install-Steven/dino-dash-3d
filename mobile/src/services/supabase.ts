import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured } from '../config/env';
import {
  getChunkedSecureItem,
  removeChunkedSecureItem,
  setChunkedSecureItem,
} from './secureStorage';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getChunkedSecureItem(`sb_${key}`),
  setItem: (key: string, value: string) => setChunkedSecureItem(`sb_${key}`, value),
  removeItem: (key: string) => removeChunkedSecureItem(`sb_${key}`),
};

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clientInstance;
}
