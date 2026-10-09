import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Header, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { getPublicWarnings } from '../services/api';
import { colors } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState([]);
  useFocusEffect(useCallback(() => {
    getPublicWarnings().then(setWarnings).catch(() => setWarnings([]));
  }, []));
  return <Screen><Header title={`Hello, ${user?.name || 'there'}`} subtitle="Stay aware. Report quickly. Keep Sri Lanka safer." />{warnings.length > 0 && <Card><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>DMC announcements</Text>{warnings.slice(0, 3).map(warning => <Text key={warning.id} style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}><Text style={{ fontWeight: '800', color: colors.text }}>{warning.title}: </Text>{warning.message}</Text>)}</Card>}<Card onPress={() => navigation.navigate('Notifications')}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Official notifications</Text><Text style={{ color: colors.muted, marginTop: 6 }}>View warnings and announcements from DMC.</Text></Card><Card><Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>See a hazard?</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>Share its type, location, and a photo so DMC officers can verify it.</Text><Button title="Report a hazard" onPress={() => navigation.navigate('Report')} /></Card><Card onPress={() => navigation.navigate('Reports')}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Track my reports</Text><Text style={{ color: colors.muted, marginTop: 6 }}>Review submitted reports and their verification status.</Text></Card></Screen>;
}
