import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Header, Screen } from '../components/UI';
import { getNotifications, markNotificationRead } from '../services/api';
import { colors } from '../theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try { setError(''); setItems(await getNotifications()); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function read(item) {
    if (item.readAt) return;
    try {
      const updated = await markNotificationRead(item.id);
      setItems(current => current.map(entry => entry.id === updated.id ? updated : entry));
    } catch (failure) { setError(failure.message); }
  }
  return <Screen><Header title="Notifications" subtitle="Official DMC warnings for your account."/><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>{loading ? <ActivityIndicator color={colors.primary}/> : error ? <Text style={{ color: colors.danger }}>{error}</Text> : items.length ? items.map(item => <Pressable key={item.id} onPress={() => read(item)}><Card><Text style={{ fontWeight: item.readAt ? '600' : '800', color: colors.text }}>{item.title}</Text><Text style={{ color: colors.muted, marginTop: 7, lineHeight: 21 }}>{item.message}</Text><Text style={{ color: colors.primary, marginTop: 8, fontSize: 12 }}>{item.readAt ? 'Read' : 'New'} · {new Date(item.createdAt).toLocaleString()}</Text></Card></Pressable>) : <Text style={{ color: colors.muted }}>No notifications yet.</Text>}</ScrollView></Screen>;
}
