import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Header, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  return <Screen>
    <Header title="Profile" subtitle="Your mobile account details." />
    <Card>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{user?.name}</Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>{user?.email}</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.phone}</Text>
      <Text style={{ color: colors.primary, marginTop: 12, fontWeight: '700' }}>{user?.role === 'COMMUNITY_VOLUNTEER' ? 'Community volunteer' : 'Citizen'}</Text>
    </Card>
    {!confirmingLogout ? <Button title="Log out" secondary onPress={() => setConfirmingLogout(true)} /> : <View>
      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12 }}>Are you sure you want to log out?</Text>
      <Button title="Confirm log out" onPress={logout} />
      <Button title="Cancel" secondary onPress={() => setConfirmingLogout(false)} />
    </View>}
  </Screen>;
}
