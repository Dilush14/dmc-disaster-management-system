import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DataSourceNotice from '../components/DataSourceNotice';
import MonitoringLegend from '../components/MonitoringLegend';
import useMonitoringData from '../hooks/useMonitoringData';
import { monitoringService } from '../services/monitoringService';

const layerOptions = ['Hazard Warnings', 'Hazard Reports', 'Shelters', 'Deployed Teams', 'Road Status', 'Weather Radar', 'River Levels', 'District Boundaries'];
const districtCoordinates = {
  Colombo: [6.9271, 79.8612],
  Kandy: [7.2906, 80.6337],
  Gampaha: [7.0873, 79.9997],
  Matara: [5.9485, 80.5353],
  Kurunegala: [7.4863, 80.3623],
  Jaffna: [9.6613, 80.0255],
};

const markerColor = (type, severity) => {
  if (type === 'Warning') return '#ef4444';
  if (type === 'Report') return '#f59e0b';
  if (type === 'Shelter') return '#10b981';
  if (severity === 'High') return '#ef4444';
  if (severity === 'Moderate') return '#f59e0b';
  return '#2563eb';
};

export default function RealtimeMonitoringPage() {
  const { district = 'Colombo' } = useParams();
  const mapRef = useRef(null);
  const { data, loading, error, source, notice } = useMonitoringData(
    () => monitoringService.getRealtimeMonitoringData(district), district,
  );

  useEffect(() => {
    if (!data || !mapRef.current) return undefined;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const activeItems = data.activeItems || [];
    const validItems = activeItems.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    if (validItems.length > 0) {
      const bounds = validItems.map(item => [item.latitude, item.longitude]);
      map.fitBounds(bounds, { padding: [32, 32] });
      validItems.forEach(item => {
        const marker = L.circleMarker([item.latitude, item.longitude], {
          radius: item.severity === 'High' ? 10 : 8,
          color: '#ffffff',
          weight: 2,
          fillColor: markerColor(item.type, item.severity),
          fillOpacity: 0.95,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 180px; font-family: sans-serif;">
            <strong>${item.label}</strong><br />
            <span>${item.location}</span><br />
            <span>${item.type} · ${item.severity}</span><br />
            <small>${item.time}</small>
          </div>
        `);
      });
    } else {
      const center = districtCoordinates[district] || districtCoordinates.Colombo;
      map.setView(center, 10);
    }

    map.invalidateSize();

    return () => map.remove();
  }, [data, district]);

  if (loading || error || !data) {
    return <div className="space-y-5"><h1 className="text-3xl font-black text-slate-900">Real-Time Monitoring</h1><DataSourceNotice loading={loading} error={error} /></div>;
  }

  return (
    <div className="space-y-6">
      <DataSourceNotice source={source} notice={notice} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Monitoring & Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Real-Time Monitoring</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {(data.layers || layerOptions).map(layer => (
              <label key={layer} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-blue-600" />
                {layer}
              </label>
            ))}
          </div>
          <div ref={mapRef} className="h-[520px] overflow-hidden rounded-xl border border-slate-200" />
          <MonitoringLegend />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Active Items</h3>
          <div className="space-y-3">
            {(data.activeItems || []).length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No active items are currently available for {district}.</p>}
            {(data.activeItems || []).map(item => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${item.severity === 'High' ? 'bg-red-100 text-red-700' : item.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.severity}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">{item.location}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
