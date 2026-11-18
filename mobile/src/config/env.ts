import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const ENV = {
  gameUrl:
    process.env.EXPO_PUBLIC_GAME_URL?.trim() ||
    (typeof extra.gameUrl === 'string' ? extra.gameUrl : '') ||
    'https://dino-dash-3d-six.vercel.app',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
} as const;

export function isSupabaseConfigured(): boolean {
  return (
    ENV.supabaseUrl.startsWith('https://') &&
    !ENV.supabaseUrl.includes('SEU-PROJETO') &&
    ENV.supabaseAnonKey.length > 20 &&
    !ENV.supabaseAnonKey.includes('SUA_CHAVE')
  );
}
