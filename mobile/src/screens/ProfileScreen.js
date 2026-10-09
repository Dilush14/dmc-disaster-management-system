import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Header, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  return <Screen>
    <Header eyebrow="Account" title="Profile" subtitle="Your mobile account details." />
    <Card>
      <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text></View>
      <Text style={{ fontSize: 21, fontWeight: '800', color: colors.text }}>{user?.name}</Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>{user?.email}</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.phone}</Text>
      <Badge label={user?.role === 'COMMUNITY_VOLUNTEER' ? 'Community volunteer' : 'Citizen'} tone="success" />
    </Card>
    {!confirmingLogout ? <Button title="Log out" secondary onPress={() => setConfirmingLogout(true)} /> : <View>
      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12 }}>Are you sure you want to log out?</Text>
      <Button title="Confirm log out" onPress={logout} />
      <Button title="Cancel" secondary onPress={() => setConfirmingLogout(false)} />
    </View>}
  </Screen>;
}
