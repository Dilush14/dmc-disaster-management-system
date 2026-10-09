import { Text } from 'react-native';
import { Button, Card, Header, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  return <Screen><Header title={`Hello, ${user?.name || 'there'}`} subtitle="Stay aware. Report quickly. Keep Sri Lanka safer." /><Card><Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>See a hazard?</Text><Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>Share its type, location, and a photo so DMC officers can verify it.</Text><Button title="Report a hazard" onPress={() => navigation.navigate('Report')} /></Card><Card onPress={() => navigation.navigate('Reports')}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Track my reports</Text><Text style={{ color: colors.muted, marginTop: 6 }}>Review submitted reports and their verification status.</Text></Card></Screen>;
}
