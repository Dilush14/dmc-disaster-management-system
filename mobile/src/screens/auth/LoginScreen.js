import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Button, Field, Header, Screen } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() { if (!email || !password) return Alert.alert('Missing details', 'Enter your email and password.'); setBusy(true); try { await login(email, password); } catch (error) { Alert.alert('Unable to log in', error.message); } finally { setBusy(false); } }
  async function forgot() { if (!email) return Alert.alert('Enter your email', 'Enter your email first.'); try { await resetPassword(email); Alert.alert('Check your email', 'Password reset instructions have been sent.'); } catch (error) { Alert.alert('Unable to reset password', error.message); } }
  return <Screen><Header title="Welcome back" subtitle="Log in to report a hazard and follow its status." /><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry /><Button title={busy ? 'Logging in...' : 'Log in'} onPress={submit} disabled={busy} /><Pressable onPress={forgot}><Text style={{ textAlign: 'center', marginTop: 18, color: '#0c4a6e', fontWeight: '700' }}>Forgot password?</Text></Pressable><Pressable onPress={() => navigation.navigate('Signup')}><Text style={{ textAlign: 'center', marginTop: 25, color: '#64748b' }}>New here? <Text style={{ color: '#0c4a6e', fontWeight: '700' }}>Create an account</Text></Text></Pressable></Screen>;
}
