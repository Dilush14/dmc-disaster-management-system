import { useEffect, useState } from 'react';

export default function useMonitoringData(loader, key) {
  const [state, setState] = useState({ data: null, loading: true, error: '', source: '' });

  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: '' }));

    loader().then(result => {
      if (active) setState({ ...result, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ data: null, source: '', loading: false, error: error.message || 'Unable to load monitoring data.' });
    });

    return () => { active = false; };
  }, [key]);

  return state;
}