import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

export default function App() {
  return <AuthProvider><NavigationContainer><RootNavigator /><StatusBar style="dark" /></NavigationContainer></AuthProvider>;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return user ? <AppNavigator /> : <AuthNavigator />;
}
