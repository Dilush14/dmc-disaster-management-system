import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Header, Screen } from '../components/UI';
import { getMyReports } from '../services/api';
import { hazardLabel, statusLabel } from '../data/catalog';
import { colors } from '../theme';

export default function MyReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); try { setReports(await getMyReports()); setError(''); } catch (failure) { setError(failure.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}><Header title="My reports" subtitle="Follow the reports you have submitted." />{loading ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={{ color: colors.danger }}>{error}</Text> : reports.length === 0 ? <Text style={{ color: colors.muted }}>You have not submitted any reports yet.</Text> : reports.map(report => <Card key={report.id} onPress={() => navigation.navigate('ReportDetails', { id: report.id })}><Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{hazardLabel(report.hazardType)}</Text><Text style={{ color: colors.muted, marginTop: 5 }}>{new Date(report.dateTime || report.createdAt).toLocaleString()}</Text><Text style={{ color: report.status === 'VERIFIED' ? colors.success : report.status === 'REJECTED' ? colors.danger : colors.warning, marginTop: 8, fontWeight: '800' }}>{statusLabel(report.status)}</Text></Card>)}</Screen>;
}
