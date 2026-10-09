import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '../theme';

export function Screen({ children, scroll = true, ...props }) {
  const Container = scroll ? require('react-native').ScrollView : View;
  return <Container {...props} contentContainerStyle={scroll ? styles.screen : styles.fill} keyboardShouldPersistTaps="handled">{children}</Container>;
}
export function Header({ title, subtitle }) { return <View style={styles.header}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>; }
export function Field({ label, error, ...props }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.multiline, error && styles.errorInput]} placeholderTextColor="#94a3b8" />{error ? <Text style={styles.error}>{error}</Text> : null}</View>; }
export function Button({ title, onPress, secondary = false, disabled = false }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>; }
export function Card({ children, onPress }) { const Container = onPress ? Pressable : View; return <Container onPress={onPress} style={styles.card}>{children}</Container>; }
export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background }, screen: { flexGrow: 1, padding: spacing.lg, backgroundColor: colors.background },
  header: { marginBottom: spacing.lg }, title: { fontSize: 28, fontWeight: '800', color: colors.text }, subtitle: { marginTop: spacing.xs, color: colors.muted, fontSize: 15, lineHeight: 21 },
  field: { marginBottom: spacing.md }, label: { marginBottom: spacing.xs, color: colors.text, fontWeight: '700' }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 14, color: colors.text, fontSize: 16 }, multiline: { minHeight: 110, textAlignVertical: 'top' }, errorInput: { borderColor: colors.danger }, error: { color: colors.danger, marginTop: 4 },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 15, marginTop: spacing.sm }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, secondary: { backgroundColor: colors.primaryLight }, secondaryText: { color: colors.primary }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.75 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }, 
});
