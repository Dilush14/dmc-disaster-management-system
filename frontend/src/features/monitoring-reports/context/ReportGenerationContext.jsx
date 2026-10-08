import { createContext, useContext, useMemo, useState } from 'react';
import { createReportConfig, generateReport } from '../utils/monitoringReports.js';

const ReportGenerationContext = createContext(null);

export function ReportGenerationProvider({ children }) {
  const [reportConfig, setReportConfig] = useState(() => createReportConfig());
  const [reportResult, setReportResult] = useState(null);
  const [error, setError] = useState('');

  const updateReportConfig = (changes = {}) => {
    setReportConfig(previous => ({ ...previous, ...changes }));
  };

  const resetReportConfig = () => {
    setReportConfig(createReportConfig());
    setReportResult(null);
    setError('');
  };

  const generateReportForConfig = (config = reportConfig) => {
    const normalized = createReportConfig(config);
    const missingData = !normalized.dateFrom || !normalized.dateTo || !normalized.selectedSections.length;

    if (missingData) {
      const message = 'Report generation failed because required report sections or date range are incomplete.';
      setError(message);
      setReportResult(null);
      return { ok: false, message };
    }

    const producedReport = generateReport(normalized);
    setReportResult(producedReport);
    setError('');
    return { ok: true, report: producedReport };
  };

  const value = useMemo(() => ({
    reportConfig,
    reportResult,
    error,
    updateReportConfig,
    resetReportConfig,
    generateReportForConfig,
  }), [reportConfig, reportResult, error]);

  return <ReportGenerationContext.Provider value={value}>{children}</ReportGenerationContext.Provider>;
}

export function useReportGeneration() {
  const context = useContext(ReportGenerationContext);
  if (!context) {
    throw new Error('useReportGeneration must be used within a ReportGenerationProvider');
  }
  return context;
}

export default ReportGenerationContext;
