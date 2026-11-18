import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const SNAPSHOT_KEY = 'dino_dash_3d_snapshot_v1';
const CUSTOM_URL_KEY = 'dino_dash_3d_custom_url_v1';

/**
 * Armazena strings maiores que o limite de 2048 bytes do expo-secure-store
 * dividindo em chunks indexados com prefixo de contagem.
 */
export async function setChunkedSecureItem(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(`${key}__chunks`, '1');
    await SecureStore.setItemAsync(`${key}__0`, value);
    return;
  }

  const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(`${key}__chunks`, String(totalChunks));

  for (let i = 0; i < totalChunks; i++) {
    const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}__${i}`, slice);
  }
}

export async function getChunkedSecureItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}__chunks`);
  if (!countRaw) {
    // Fallback para chaves gravadas sem chunking
    return SecureStore.getItemAsync(key);
  }

  const totalChunks = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
    return null;
  }

  const parts: string[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
    if (chunk === null) {
      return null;
    }
    parts.push(chunk);
  }

  return parts.join('');
}

export async function removeChunkedSecureItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${key}__chunks`);
  if (countRaw) {
    const totalChunks = Number.parseInt(countRaw, 10);
    if (Number.isFinite(totalChunks) && totalChunks > 0) {
      for (let i = 0; i < totalChunks; i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`);
      }
    }
    await SecureStore.deleteItemAsync(`${key}__chunks`);
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveGameSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  const serialized = JSON.stringify({
    updatedAt: new Date().toISOString(),
    snapshot,
  });
  await setChunkedSecureItem(SNAPSHOT_KEY, serialized);
}

export async function loadGameSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await getChunkedSecureItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: Record<string, unknown> };
    return parsed?.snapshot ?? null;
  } catch {
    return null;
  }
}

export async function saveCustomGameUrl(url: string): Promise<void> {
  if (!url.trim()) {
    await SecureStore.deleteItemAsync(CUSTOM_URL_KEY);
    return;
  }
  await SecureStore.setItemAsync(CUSTOM_URL_KEY, url.trim());
}

export async function loadCustomGameUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CUSTOM_URL_KEY);
  } catch {
    return null;
  }
}
