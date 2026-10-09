import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { syncPendingHazardReports } from './src/services/offlineReports';
import { registerForPushNotifications } from './src/services/pushNotifications';

export default function App() {
  return <AuthProvider><NavigationContainer><RootNavigator /><StatusBar style="dark" /></NavigationContainer></AuthProvider>;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!user) return undefined;
    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try { await syncPendingHazardReports(); } catch { /* Keep the queue for the next connection event. */ }
      finally { syncing = false; }
    };
    sync();
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) sync();
    });
    return unsubscribe;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().catch(() => { /* Alerts still appear in the Notifications tab. */ });
  }, [user]);
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return user ? <AppNavigator /> : <AuthNavigator />;
}
