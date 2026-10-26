import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Codzienne przypomnienie o 8:05, po porannej aktualizacji listy. */
export async function setupDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('codziennie', {
        name: 'Nowe konkursy',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.some((n) => n.identifier === 'konkursy-rano')) return;
    await Notifications.scheduleNotificationAsync({
      identifier: 'konkursy-rano',
      content: {
        title: 'Konkursownik',
        body: 'Lista konkursów jest zaktualizowana. Zobacz, co nowego!',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 5,
        channelId: 'codziennie',
      },
    });
  } catch {
    // powiadomienia są dodatkiem – aplikacja działa bez nich
  }
}
