import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import pool from '../config/database';

const expo = new Expo();

export const sendPushNotification = async (
  userIds: string | string[],
  title: string,
  body: string,
  data: any = {}
) => {
  if (!userIds || userIds.length === 0) return;

  try {
    // Fetch push tokens for these users
    // If userIds is a single string, wrap it.
    const ids = Array.isArray(userIds) ? userIds : [userIds];

    const result = await pool.query(
      'SELECT push_token FROM users WHERE id = ANY($1) AND push_token IS NOT NULL',
      [ids]
    );

    const pushTokens = result.rows.map(r => r.push_token);

    if (pushTokens.length === 0) return;

    let messages: ExpoPushMessage[] = [];
    for (let pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      });
    }

    let chunks = expo.chunkPushNotifications(messages);

    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
        // In production, you should inspect the tickets for errors
      } catch (error) {
        console.error('Error sending push chunk:', error);
      }
    }
  } catch (err) {
    console.error('Push notification error:', err);
  }
};
