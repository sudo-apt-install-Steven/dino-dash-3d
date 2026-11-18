export type HapticStyle = 'light' | 'medium' | 'heavy';

export type OrientationMode = 'landscape' | 'portrait' | 'auto';

export interface ShareScorePayload {
  score: number;
  biome?: string;
}

export interface SaveSnapshotPayload {
  snapshot: Record<string, unknown>;
}

export interface DailyReminderPayload {
  hour: number;
  minute: number;
}

export interface DeepLinkPayload {
  room: string | null;
  transport: string | null;
}

export interface OfflineStatusPayload {
  online: boolean;
}

export type WebToExpoMessage =
  | { type: 'HAPTIC_IMPACT'; payload?: { style?: HapticStyle } | HapticStyle }
  | { type: 'SHARE_SCORE'; payload: ShareScorePayload }
  | { type: 'SAVE_SYNC'; payload: SaveSnapshotPayload }
  | { type: 'SCHEDULE_DAILY_REMINDER'; payload: DailyReminderPayload }
  | { type: 'SET_ORIENTATION'; payload?: { mode?: OrientationMode } | OrientationMode };

export type ExpoToWebMessage =
  | {
      type: 'NATIVE_READY';
      payload: {
        platform: string;
        appVersion: string;
        restoredSnapshot: Record<string, unknown> | null;
      };
    }
  | { type: 'OFFLINE_STATUS'; payload: OfflineStatusPayload }
  | { type: 'DEEP_LINK'; payload: DeepLinkPayload };
