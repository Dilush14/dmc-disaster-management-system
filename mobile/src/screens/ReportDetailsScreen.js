import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Card, Header, Screen } from '../components/UI';
import { getReport } from '../services/api';
import { hazardLabel, statusLabel } from '../data/catalog';
import { colors } from '../theme';

export default function ReportDetailsScreen({ route }) {
  const [report, setReport] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getReport(route.params.id).then(setReport).catch(failure => setError(failure.message)); }, [route.params.id]);
  if (error) return <Screen><Text style={{ color: colors.danger }}>{error}</Text></Screen>;
  if (!report) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  return <Screen><Header title={hazardLabel(report.hazardType)} subtitle={statusLabel(report.status)} /><Card><Text style={{ fontWeight: '800', color: colors.text }}>Description</Text><Text style={{ color: colors.muted, marginTop: 8, lineHeight: 21 }}>{report.description}</Text></Card><Card><Text style={{ fontWeight: '800', color: colors.text }}>Reported location</Text><Text style={{ color: colors.muted, marginTop: 8 }}>{report.latitude}, {report.longitude}</Text><Text style={{ color: colors.muted, marginTop: 6 }}>{new Date(report.dateTime || report.createdAt).toLocaleString()}</Text></Card>{report.rejectionReason ? <Card><Text style={{ fontWeight: '800', color: colors.danger }}>Officer feedback</Text><Text style={{ color: colors.muted, marginTop: 8 }}>{report.rejectionReason}</Text></Card> : null}</Screen>;
}
