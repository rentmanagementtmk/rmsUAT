import { useMemo, useState } from 'react';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { apiGet, apiPost } from '../lib/api';
import { useHouseCache } from '../lib/useHouseCache';
import { BUILDINGS, HOUSES } from '../lib/houses';
import { inr, prevMonth, fmtDateOnly } from '../lib/format';

interface HouseWithPreview {
  HouseID: string;
  BuildingName: string;
  HouseLabel: string;
  DisplayName?: string;
  TenantName?: string;
}
interface Preview {
  expectedRent: number;
  arrears: number;
  currentBalance: number;
  paidForMonth: number;
}
interface DupRecord {
  HouseID: string;
  HouseLabel: string;
  RentForMonth: number;
  RentForYear: number;
  AmountReceived: number;
  CollectedDate: string;
}

const monthKey = (m: number) => `month.${m}`;

export function CollectPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { houseCache, isHouseActive, refresh: refreshHouses } = useHouseCache();

  const initial = prevMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [activeBuilding, setActiveBuilding] = useState<string>(BUILDINGS[0]);

  const [currentHouse, setCurrentHouse] = useState<HouseWithPreview | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH'>('ONLINE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dupRecords, setDupRecords] = useState<DupRecord[] | null>(null);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  async function selectHouse(houseId: string) {
    setLoading(true);
    try {
      const res = await apiGet<{ error?: string; house?: HouseWithPreview; preview?: Preview }>({
        action: 'getHouseWithPreview',
        qr: houseId,
        year,
        month,
      });
      if (res.error === 'VACANT') { showToast(t('msg.house_vacant'), 'warning'); return; }
      if (res.error || !res.house) { showToast(t('msg.house_not_found'), 'error'); return; }
      setCurrentHouse(res.house);
      setPreview(res.preview ?? null);
      setAmount('');
      setPaymentMode('ONLINE');
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function resetToScan() {
    setCurrentHouse(null);
    setPreview(null);
    setAmount('');
    const p = prevMonth();
    setMonth(p.month);
    setYear(p.year);
  }

  const postPaymentAmount = useMemo(() => {
    if (!preview) return null;
    const amt = parseFloat(amount);
    const paid = isNaN(amt) || amt < 0 ? 0 : amt;
    return Math.max(0, (preview.currentBalance || 0) - paid);
  }, [preview, amount]);

  async function doSave() {
    if (!currentHouse) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showToast(t('msg.invalid_amount'), 'error'); return; }

    setSaving(true);
    try {
      const res = await apiPost<{ error?: string; duplicate?: boolean }>({
        action: 'saveRent',
        houseId: currentHouse.HouseID,
        rentForYear: year,
        rentForMonth: month,
        amount: amt,
        paymentMode,
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        const entry = HOUSES.find((h) => h.id === currentHouse.HouseID);
        const friendlyName = entry ? `${entry.building} ${entry.displayNum}` : currentHouse.HouseLabel;
        const msg = res.duplicate
          ? `${t('msg.duplicate_prefix')} ${t(monthKey(month))} ${year}`
          : `${t('msg.saved')} ${friendlyName} — ${inr(amt)}`;
        showToast(msg, res.duplicate ? 'warning' : 'success');
        resetToScan();
      }
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentHouse) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showToast(t('msg.invalid_amount'), 'error'); return; }

    // Pre-check: warn if a record already exists for this house/month/year
    try {
      const dupCheck = await apiGet<{ records?: DupRecord[] }>({
        action: 'getDashboard',
        year,
        month,
        houseId: currentHouse.HouseID,
      });
      if (dupCheck.records && dupCheck.records.length > 0) {
        setDupRecords(dupCheck.records);
        return;
      }
    } catch {
      // if the dup-check itself fails, fall through and let saveRent proceed
    }
    await doSave();
  }

  const houseEntry = currentHouse ? HOUSES.find((h) => h.id === currentHouse.HouseID) : null;
  const baseName = houseEntry ? `${houseEntry.building} ${houseEntry.displayNum}` : currentHouse?.HouseLabel;
  const displayLine = currentHouse?.TenantName ? `${baseName} - ${currentHouse.TenantName}` : baseName;

  return (
    <Layout>
      {!currentHouse && (
        <section id="scan-section">
          <div className="card">
            <h2>{t('collect.title')}</h2>
            <p>{t('collect.subtitle')}</p>
            <div className="building-tabs">
              {BUILDINGS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`building-tab${b === activeBuilding ? ' active' : ''}`}
                  onClick={() => setActiveBuilding(b)}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="house-grid">
              {HOUSES.filter((h) => h.building === activeBuilding).map((h) => {
                const active = isHouseActive(h.id);
                const tenant = houseCache[h.id]?.TenantName;
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`house-grid-btn${active ? '' : ' house-grid-btn--vacant'}`}
                    disabled={!active}
                    onClick={() => selectHouse(h.id)}
                  >
                    <span className="house-grid-num">{h.displayNum}</span>
                    <span className="house-grid-tenant">{active ? (tenant || '—') : t('misc.vacant_label')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {currentHouse && (
        <section id="form-section">
          <div className="house-card">
            <p className="house-building">{currentHouse.BuildingName}</p>
            <p className="house-name">{displayLine}</p>
            <p className="house-rent">
              {preview ? `${t('collect.preview_rent')} ${inr(preview.expectedRent)}` : ''}
            </p>
          </div>

          <form className="card" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="amount">{t('collect.amount_label')}</label>
              <input
                type="number"
                id="amount"
                inputMode="decimal"
                placeholder={t('collect.amount_ph')}
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="amount-hint" aria-live="polite">
                <span>{t('collect.preview_due')}: <strong>{preview ? inr(preview.currentBalance) : '—'}</strong></span>
                <span>{t('collect.preview_after')}: <strong>{postPaymentAmount != null ? inr(postPaymentAmount) : '—'}</strong></span>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="rent-month">{t('collect.month_label')}</label>
                <select id="rent-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{t(monthKey(m))}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rent-year">{t('collect.year_label')}</label>
                <select id="rent-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>{t('collect.payment_mode_label')}</label>
              <div className="mode-toggle" role="radiogroup" aria-label="Payment Mode">
                <button
                  type="button"
                  className={`mode-option${paymentMode === 'ONLINE' ? ' active' : ''}`}
                  role="radio"
                  aria-checked={paymentMode === 'ONLINE'}
                  onClick={() => setPaymentMode('ONLINE')}
                >
                  {t('collect.payment_mode_online')}
                </button>
                <button
                  type="button"
                  className={`mode-option${paymentMode === 'CASH' ? ' active' : ''}`}
                  role="radio"
                  aria-checked={paymentMode === 'CASH'}
                  onClick={() => setPaymentMode('CASH')}
                >
                  {t('collect.payment_mode_cash')}
                </button>
              </div>
            </div>
            <div className="btn-group">
              <button type="button" className="btn btn-secondary" onClick={resetToScan}>{t('collect.back')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? t('collect.saving') : t('collect.save')}
              </button>
            </div>
          </form>
        </section>
      )}

      <PageLoader visible={loading} />

      {dupRecords && (
        <div className="modal-overlay">
          <div className="modal-card">
            <p className="modal-title">{t('modal.dup_title')}</p>
            <div className="modal-scroll-body">
              <p className="modal-body">
                {dupRecords.length > 1 ? t('modal.dup_body_multi') : t('modal.dup_body')}
              </p>
              <div className="dup-record">
                {dupRecords.map((r, i) => (
                  <div className="dup-row" key={i}>
                    <span>{inr(r.AmountReceived)}</span>
                    <strong>{fmtDateOnly(r.CollectedDate)}</strong>
                  </div>
                ))}
                {dupRecords.length > 1 && (
                  <div className="dup-row dup-total-row">
                    <span>{t('modal.total')}</span>
                    <strong>{inr(dupRecords.reduce((s, r) => s + r.AmountReceived, 0))}</strong>
                  </div>
                )}
              </div>
              <p className="modal-question">{t('modal.dup_question')}</p>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => setDupRecords(null)}>{t('collect.cancel')}</button>
              <button
                className="btn btn-primary"
                onClick={async () => { setDupRecords(null); await doSave(); refreshHouses(); }}
              >
                {t('modal.save_anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
