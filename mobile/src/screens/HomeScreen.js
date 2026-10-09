import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Badge, Button, Card, Header, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { getPublicWarnings } from '../services/api';
import { colors } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState([]);
  useFocusEffect(useCallback(() => {
    getPublicWarnings().then(setWarnings).catch(() => setWarnings([]));
  }, []));
  return <Screen><Header eyebrow="Disaster Management Centre" title={`Hello, ${user?.name || 'there'}`} subtitle="Stay aware. Report quickly. Keep Sri Lanka safer." /><Card accent={colors.accent}><Badge label="Emergency reporting" tone="warning" /><Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12 }}>See something dangerous?</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 21 }}>Send the location and details to help response teams act faster.</Text><Button title="Report a hazard" onPress={() => navigation.navigate('Report')} /></Card>{warnings.length > 0 && <Card accent={colors.danger}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>DMC announcements</Text>{warnings.slice(0, 3).map(warning => <Text key={warning.id} style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}><Text style={{ fontWeight: '800', color: colors.text }}>{warning.title}: </Text>{warning.message}</Text>)}</Card>}<Card onPress={() => navigation.navigate('Notifications')}><Badge label="Stay informed" /><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 }}>Official notifications</Text><Text style={{ color: colors.muted, marginTop: 6 }}>View warnings and announcements from DMC.</Text></Card><Card onPress={() => navigation.navigate('Reports')}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Track my reports</Text><Text style={{ color: colors.muted, marginTop: 6 }}>Review submitted reports and their verification status.</Text></Card></Screen>;
}
