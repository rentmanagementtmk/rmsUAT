import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import { getDebugLog, clearDebugLog, type DebugEntry } from '../lib/debugLog';

/** Visible only with ?debug=1 in the URL — shows live token status + the event history recorded
 * by debugLog() so we can see exactly what happened around an unexpected logout on a real device. */
export function DebugBanner() {
  const [log, setLog] = useState<DebugEntry[]>([]);
  const [hasToken, setHasToken] = useState(!!getAuthToken());

  useEffect(() => {
    const id = setInterval(() => {
      setLog(getDebugLog());
      setHasToken(!!getAuthToken());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '40vh', overflowY: 'auto',
      background: 'rgba(0,0,0,0.85)', color: '#0f0', fontFamily: 'monospace', fontSize: 11,
      padding: '8px', zIndex: 9999,
    }}>
      <div style={{ color: hasToken ? '#0f0' : '#f55', fontWeight: 'bold', marginBottom: 4 }}>
        token: {hasToken ? 'present' : 'MISSING'} — {new Date().toLocaleTimeString()}
        <button onClick={clearDebugLog} style={{ marginLeft: 8 }}>clear log</button>
      </div>
      {[...log].reverse().map((e, i) => (
        <div key={i}>{e.t.slice(11, 19)} — {e.event}{e.extra ? ` (${JSON.stringify(e.extra)})` : ''}</div>
      ))}
    </div>
  );
}
