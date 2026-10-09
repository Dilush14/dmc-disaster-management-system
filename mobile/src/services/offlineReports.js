import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { submitHazardReport } from './api';

const QUEUE_KEY = '@dmc/pending-hazard-reports';

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function webPhotoDataUrl(photo) {
  const response = await fetch(photo.uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected photo could not be saved offline.'));
    reader.readAsDataURL(blob);
  });
}

async function persistPhoto(photo, requestId) {
  if (!photo) return null;
  if (Platform.OS === 'web') {
    return { ...photo, uri: await webPhotoDataUrl(photo) };
  }
  const extension = (photo.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
  const target = `${FileSystem.documentDirectory}hazard-${requestId}.${extension}`;
  await FileSystem.copyAsync({ from: photo.uri, to: target });
  return { ...photo, uri: target };
}

export async function enqueueHazardReport(data) {
  const photo = await persistPhoto(data.photo, data.clientRequestId);
  const item = {
    ...data,
    photo,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  const queue = await readQueue();
  await writeQueue([...queue.filter(existing => existing.clientRequestId !== item.clientRequestId), item]);
  return item;
}

export async function getPendingHazardReports() {
  return readQueue();
}

export async function syncPendingHazardReports() {
  const queue = await readQueue();
  const remaining = [];
  const submitted = [];

  for (const item of queue) {
    try {
      const result = await submitHazardReport(item);
      submitted.push({ ...item, result });
    } catch (error) {
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: error.message });
    }
  }

  await writeQueue(remaining);
  return { submitted, remaining };
}
