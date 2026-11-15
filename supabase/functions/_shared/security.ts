import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const OFFICIAL_ORIGINS = new Set([
  'https://dino-dash-3d-six.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

function isAllowedLanOrigin(origin: string): boolean {
  if (/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):(\d{2,5})$/.test(origin)) {
    return true;
  }
  return /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):(5173|4173|5174|4179)$/.test(origin);
}

export function isOriginAllowed(req: Request): { ok: boolean; origin: string } {
  const origin = (req.headers.get('origin') || '').trim();
  if (!origin) {
    // Chamadas diretas CLI/servidor sem header Origin permanecem protegidas por Bearer JWT/API key.
    return { ok: true, origin: 'no-origin' };
  }
  const extraRaw = Deno.env.get('ALLOWED_ORIGINS') || '';
  const extraSet = new Set(
    extraRaw.split(',').map((s) => s.trim()).filter(Boolean)
  );
  if (OFFICIAL_ORIGINS.has(origin) || extraSet.has(origin) || isAllowedLanOrigin(origin)) {
    return { ok: true, origin };
  }
  return { ok: false, origin };
}

export function buildCorsHeaders(origin: string): Record<string, string> {
  const allowOrigin = origin && origin !== 'no-origin'
    ? origin
    : 'https://dino-dash-3d-six.vercel.app';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dino-player-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

export function jsonResponse(body: Record<string, unknown>, status = 200, origin = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildCorsHeaders(origin)
  });
}

export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('DINO_RUN_HMAC_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const enc = new TextEncoder().encode(`dino-dash-3d:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return await crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signPayload(payload: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySignature(payload: string, expectedHex: string): Promise<boolean> {
  if (!expectedHex || typeof expectedHex !== 'string') return false;
  const actual = await signPayload(payload);
  if (actual.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashIp(req: Request): Promise<string> {
  const fwd = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ip:${fwd}`));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function resolveActor(req: Request, admin: SupabaseClient): Promise<{
  ok: boolean;
  actorKey: string;
  authUid: string | null;
  error?: string;
}> {
  const apikey = (req.headers.get('apikey') || '').trim();
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

  if (!apikey && !bearer) {
    return { ok: false, actorKey: '', authUid: null, error: 'Credenciais públicas de projeto ausentes.' };
  }

  if (bearer && bearer.split('.').length === 3) {
    try {
      const payloadPart = bearer.split('.')[1];
      if (payloadPart) {
        const claims = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
        if (claims?.sub && claims?.role === 'authenticated') {
          const { data } = await admin.auth.getUser(bearer);
          if (data?.user?.id) {
            return { ok: true, actorKey: `uid:${data.user.id}`, authUid: data.user.id };
          }
        }
      }
    } catch {
      // Ignora token nao-autenticado e tenta identificador pseudonimo validado.
    }
  }

  const rawGuest = (req.headers.get('x-dino-player-id') || '').trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(rawGuest)) {
    return { ok: true, actorKey: `guest:${rawGuest}`, authUid: null };
  }
  return { ok: false, actorKey: '', authUid: null, error: 'Identificador de jogador ausente ou inválido.' };
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  scope: string,
  actorKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; count: number }> {
  const now = new Date();
  const cutoffIso = new Date(now.getTime() - windowSeconds * 1000).toISOString();
  const { data: existing } = await admin
    .from('rate_limits')
    .select('req_count, window_start')
    .eq('scope', scope)
    .eq('actor_key', actorKey)
    .maybeSingle();

  if (!existing || new Date(existing.window_start).toISOString() < cutoffIso) {
    await admin.from('rate_limits').upsert({
      scope,
      actor_key: actorKey,
      req_count: 1,
      window_start: now.toISOString()
    });
    return { allowed: true, count: 1 };
  }

  const nextCount = Number(existing.req_count || 0) + 1;
  await admin
    .from('rate_limits')
    .update({ req_count: nextCount })
    .eq('scope', scope)
    .eq('actor_key', actorKey);

  return { allowed: nextCount <= maxRequests, count: nextCount };
}

export async function logSecurityEvent(
  admin: SupabaseClient,
  { actorKey, authUid, eventType, severity = 'info', details = {}, ipHash = '', origin = '' }: {
    actorKey: string;
    authUid: string | null;
    eventType: string;
    severity?: 'info' | 'warn' | 'high' | 'critical';
    details?: Record<string, unknown>;
    ipHash?: string;
    origin?: string;
  }
) {
  try {
    await admin.from('security_audit_logs').insert({
      actor_key: actorKey,
      auth_uid: authUid,
      event_type: eventType,
      severity,
      details,
      ip_hash: ipHash,
      origin
    });
  } catch {
    // Nunca interromper resposta por falha secundaria de log.
  }
}

export function cleanText(value: unknown, fallback: string, maxLen: number): string {
  const s = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return s || fallback;
}
