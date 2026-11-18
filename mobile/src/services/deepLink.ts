import * as Linking from 'expo-linking';
import type { DeepLinkPayload } from '../types/bridge';

export function parseDinoDeepLink(url: string | null): DeepLinkPayload | null {
  if (!url) return null;

  try {
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};

    const roomRaw = typeof params.room === 'string' ? params.room : null;
    const transportRaw = typeof params.transport === 'string' ? params.transport : null;

    // Suporta também dinodash3d://room/ABCD
    let roomFromPath: string | null = null;
    if (!roomRaw && parsed.path) {
      const match = parsed.path.match(/room\/([A-Za-z0-9_-]+)/i);
      if (match?.[1]) {
        roomFromPath = match[1];
      }
    }

    const room = (roomRaw || roomFromPath)?.trim() || null;
    const transport = transportRaw?.trim() || null;

    if (!room && !transport) {
      return null;
    }

    return { room, transport };
  } catch {
    return null;
  }
}
