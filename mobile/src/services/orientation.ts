import * as ScreenOrientation from 'expo-screen-orientation';
import type { OrientationMode } from '../types/bridge';

export async function applyOrientation(mode: OrientationMode): Promise<void> {
  try {
    if (mode === 'landscape') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else if (mode === 'portrait') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.unlockAsync();
    }
  } catch {
    // Alguns dispositivos/emuladores não suportam bloqueio em modos específicos
  }
}
