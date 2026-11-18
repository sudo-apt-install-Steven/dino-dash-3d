import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_REMINDER_ID = 'dino_dash_daily_challenge';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleDailyChallengeReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  try {
    const safeHour = Math.max(0, Math.min(23, Math.floor(hour)));
    const safeMinute = Math.max(0, Math.min(59, Math.floor(minute)));

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-challenge', {
        name: 'Desafio Diário',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180, 100, 180],
        lightColor: '#f59e0b',
      });
    }

    // Cancela lembrete anterior para evitar duplicidade
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'DINO DASH 3D — Desafio Diário',
        body: 'Uma nova corrida jurássica com seed única espera por você hoje!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: safeHour,
        minute: safeMinute,
      },
    });

    return true;
  } catch {
    return false;
  }
}
