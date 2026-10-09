import { CalendarDays, FileText, Image, MapPin, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hazardLabel } from '../data/catalog';
import { formatReportDate } from '../utils/reportValidation';
import { LocationCard } from './MobileUI';
import ReportPhoto from './ReportPhoto';
export default function ReportSummaryCard({ report, editable = false }) {
  const sections = [
    {
      title: 'Hazard Type',
      icon: TriangleAlert,
      path: '/public/report-hazard',
      content: hazardLabel(report.hazardType)
    },
    {
      title: 'Description',
      icon: FileText,
      path: '/public/report-hazard/details',
      content: report.description
    },
    {
      title: 'Location',
      icon: MapPin,
      path: '/public/report-hazard/details',
      content: <LocationCard latitude={report.latitude} longitude={report.longitude}/>
    },
    {
      title: 'Date & Time',
      icon: CalendarDays,
      path: '/public/report-hazard/details',
      content: formatReportDate(report.dateTime || report.submittedAt)
    },
    {
      title: 'Photo',
      icon: Image,
      path: '/public/report-hazard/photo',
      content: report.photoPreview ?
        <img className="summary-photo" src={report.photoPreview} alt="Hazard evidence"/> :
        report.photoUrl ? <ReportPhoto className="summary-photo" src={report.photoUrl} alt="Hazard evidence"/> : 'No photo attached'
    },
  ];
  return <div className="report-summary">
    {sections.map(
      ({ title, icon: Icon, path, content }) => <section key={title}>
        <Icon size={20}/>
        <div>
          <div className="summary-title">
            <h2>{title}</h2>
            {editable && <Link to={path} aria-label={`Edit ${title.toLowerCase()}`}>Edit</Link>}
          </div>
          <div className="summary-value">{content}</div>
        </div>
      </section>
    )}
  </div>;
}
