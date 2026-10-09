import { Text, View } from 'react-native';
import { Button, Screen, styles } from '../../components/UI';
import { colors } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  return <Screen><View style={{ flex: 1, justifyContent: 'center' }}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>DMC SRI LANKA</Text><Text style={styles.title}>Report hazards. Protect communities.</Text><Text style={styles.subtitle}>Help the Disaster Management Centre respond faster by sharing verified hazard information from where you are.</Text><Button title="Log in" onPress={() => navigation.navigate('Login')} /><Button title="Create an account" secondary onPress={() => navigation.navigate('Signup')} /></View></Screen>;
}
