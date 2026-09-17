import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Layout } from '../components/Layout';
import { BUILDINGS, HOUSES, FLOOR_LABELS } from '../lib/houses';
import { apiGet } from '../lib/api';
import '../styles/qr-print.css';

interface HouseWithToken { HouseID: string; PublicToken?: string }

export function QrPrintPage() {
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [failCount, setFailCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiGet<{ houses?: HouseWithToken[] }>({ action: 'getHouses' }).then(async (res) => {
      const map: Record<string, string> = {};
      (res.houses || []).forEach((h) => { if (h.PublicToken) map[h.HouseID] = h.PublicToken; });

      const urls: Record<string, string> = {};
      let fails = 0;
      for (const h of HOUSES) {
        const token = map[h.id];
        if (!token) { fails++; continue; }
        const doorLedgerUrl = new URL(`/door-ledger?t=${encodeURIComponent(token)}`, location.href).href;
        try {
          urls[h.id] = await QRCode.toDataURL(doorLedgerUrl, { width: 200, margin: 1, color: { dark: '#1E293B', light: '#ffffff' } });
        } catch {
          fails++;
        }
      }
      setQrDataUrls(urls);
      setFailCount(fails);
      setReady(true);
    });
  }, []);

  return (
    <Layout title="RMS">
      <div className="qrp-screen-header">
        <div>
          <h1>🏠 Door Ledger QR Print Sheet</h1>
          <p>{HOUSES.length} houses · {BUILDINGS.length} buildings · Each QR opens that house's public rent ledger. Print and paste on the back of each house's main door.</p>
        </div>
        <button className="qrp-print-btn" onClick={() => window.print()}>🖨&nbsp; Print All</button>
      </div>

      <div className="qrp-page" id="qrp-page">
        {BUILDINGS.map((b) => {
          const buildingHouses = HOUSES.filter((h) => h.building === b);
          return (
            <div className="qrp-building-section" key={b}>
              <div className="qrp-building-title">{b.toUpperCase()} · {buildingHouses.length} Houses</div>
              <div className="qrp-grid">
                {buildingHouses.map((h) => (
                  <div className="qrp-card" key={h.id}>
                    <div className="qrp-building">{b.toUpperCase()}</div>
                    <div className="qrp-img-wrap">
                      {qrDataUrls[h.id]
                        ? <img src={qrDataUrls[h.id]} width={200} height={200} alt={`QR for ${b} ${h.displayNum}`} />
                        : ready
                          ? <p style={{ color: '#DC2626', fontSize: '0.7rem' }}>QR failed to load</p>
                          : <p style={{ fontSize: '0.7rem' }}>…</p>}
                    </div>
                    <div className="qrp-floor">{b} {h.displayNum}</div>
                    <div className="qrp-id">{FLOOR_LABELS[h.floor]}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {ready && (
        <p id="qrp-status-banner">
          {failCount === 0 ? `✅ All ${HOUSES.length} QR codes rendered successfully.` : `⚠️ ${failCount} of ${HOUSES.length} failed to render.`}
        </p>
      )}
    </Layout>
  );
}
