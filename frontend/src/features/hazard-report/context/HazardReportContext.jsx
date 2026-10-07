import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createEmptyReport, mergeReportData } from '../utils/reportValidation';
const HazardReportContext = createContext(null);
export function HazardReportProvider({ children }) {
  const [reportData, setReportData] = useState(createEmptyReport);
  const [submittedReport, setSubmittedReport] = useState(null);
  const updateReportData = updates => setReportData(current => mergeReportData(current, updates));
  useEffect(() => () => { if (reportData.photoPreview) URL.revokeObjectURL(reportData.photoPreview); }, [reportData.photoPreview]);
  const resetReport = useCallback(() => setReportData(createEmptyReport()), []);
  return <HazardReportContext.Provider value={{ reportData, updateReportData, resetReport, submittedReport, setSubmittedReport }}>{children}</HazardReportContext.Provider>;
}
export const useHazardReport = () => useContext(HazardReportContext);
