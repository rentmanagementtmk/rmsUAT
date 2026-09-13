import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { apiGet } from '../lib/api';
import { BUILDINGS, HOUSES, houseSelectOption } from '../lib/houses';
import { useHouseCache } from '../lib/useHouseCache';
import { inr, fmtDateOnly } from '../lib/format';

interface LedgerPayment { amount: number; date: string; mode?: string }
interface LedgerCharge { amount: number; description: string }
interface LedgerRow {
  month: number; year: number; expected: number; paid: number; runningBalance: number;
  payments?: LedgerPayment[]; charges?: LedgerCharge[];
}
interface LedgerHouse { HouseID: string; HouseLabel: string; BuildingName: string; TenantName?: string; OccupancyDate?: string }
interface LedgerResponse {
  house: LedgerHouse; rows: LedgerRow[]; incrementHistory?: { effectiveDate: string; previousRent: number; newRent: number }[];
  totalPaid: number; outstanding: number; error?: string;
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function LedgerPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { houseCache } = useHouseCache();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const houseIdParam = params.get('house') || '';
  const [selectHouse, setSelectHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LedgerResponse | null>(null);

  const load = useCallback((houseId: string) => {
    setLoading(true);
    apiGet<LedgerResponse>({ action: 'getLedger', houseId })
      .then((res) => {
        if (res.error) { showToast(res.error, 'error'); return; }
        setData(res);
      })
      .catch(() => showToast(t('msg.net_check'), 'error'))
      .finally(() => setLoading(false));
  }, [showToast, t]);

  useEffect(() => {
    if (houseIdParam) load(houseIdParam);
  }, [houseIdParam, load]);

  if (!houseIdParam) {
    return (
      <Layout title={t('ledger.title')}>
        <section className="card">
          <div className="field">
            <label htmlFor="ledger-house-select">{t('ledger.select_house')}</label>
            <select id="ledger-house-select" value={selectHouse} onChange={(e) => setSelectHouse(e.target.value)}>
              <option value="">{t('collect.house_ph')}</option>
              {BUILDINGS.map((b) => (
                <optgroup key={b} label={b}>
                  {HOUSES.filter((h) => h.building === b).map((h) => {
                    const opt = houseSelectOption(h, houseCache[h.id]);
                    return <option key={h.id} value={h.id} disabled={opt.disabled}>{opt.label}</option>;
                  })}
                </optgroup>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" disabled={!selectHouse} onClick={() => navigate(`/ledger?house=${selectHouse}`)}>
            {t('ledger.view_btn')}
          </button>
        </section>
        <PageLoader visible={loading} />
      </Layout>
    );
  }

  return (
    <Layout title={t('ledger.title')}>
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>{t('dashboard.loading')}</span>
        </div>
      )}
      {!loading && data && (
        <div id="ledger-content">
          <div className="ledger-header-card house-card">
            <p className="house-building">{data.house.BuildingName}</p>
            <p className="house-name">
              {(() => {
                const entry = HOUSES.find((h) => h.id === data.house.HouseID);
                const base = entry ? `${entry.building} ${entry.displayNum}` : (data.house.HouseLabel || data.house.HouseID);
                return data.house.TenantName ? `${base} · ${data.house.TenantName}` : base;
              })()}
            </p>
            {data.house.OccupancyDate && <p className="house-rent">{t('ledger.since')} {fmtDateOnly(data.house.OccupancyDate)}</p>}
          </div>

          <div className="ledger-totals card">
            <div className="ledger-total-item">
              <span>{t('ledger.total_paid')}</span>
              <strong className="ledger-total-paid">{inr(data.totalPaid)}</strong>
            </div>
            <div className="ledger-total-divider"></div>
            <div className="ledger-total-item">
              <span>{t('ledger.outstanding')}</span>
              {data.outstanding > 0
                ? <strong className="ledger-total-owed">{inr(data.outstanding)}</strong>
                : <strong className="ledger-total-clear">✓ Clear</strong>}
            </div>
          </div>

          {data.incrementHistory && data.incrementHistory.length > 0 && (
            <div className="ledger-section">
              <p className="ledger-section-title">{t('ledger.inc_history')}</p>
              <div className="ledger-inc-list">
                {data.incrementHistory.map((inc, i) => (
                  <div className="ledger-inc-row" key={i}>
                    <span className="ledger-inc-date">{fmtDateOnly(inc.effectiveDate)}</span>
                    <span className="ledger-inc-arrow">{inr(inc.previousRent)} → {inr(inc.newRent)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ledger-section">
            <p className="ledger-section-title">{t('ledger.payment_history')}</p>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('ledger.col_month')}</th>
                  <th>{t('ledger.col_expected')}</th>
                  <th>{t('ledger.col_paid')}</th>
                  <th>{t('ledger.col_balance')}</th>
                </tr>
              </thead>
              <tbody>
                {[...data.rows].reverse().map((r, i) => {
                  const isPaid = r.paid >= r.expected && r.expected > 0;
                  const isPartial = r.paid > 0 && r.paid < r.expected;
                  const rowClass = isPaid ? 'ledger-row--paid' : isPartial ? 'ledger-row--partial' : 'ledger-row--unpaid';
                  return (
                    <tr className={rowClass} key={i}>
                      <td className="ledger-month-cell">
                        {MONTH_NAMES[r.month]}
                        <br /><span className="ledger-year">{r.year}</span>
                        {r.charges && r.charges.length > 0 && (
                          <span className="ledger-charges">
                            {r.charges.map((c, ci) => (
                              <span key={ci}>+ {inr(c.amount)} · {c.description}{ci < r.charges!.length - 1 ? <br /> : null}</span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td>{r.expected > 0 ? inr(r.expected) : <span className="ledger-nil">—</span>}</td>
                      <td>
                        {r.payments && r.payments.length > 0
                          ? r.payments.map((p, pi) => (
                              <span key={pi}>
                                <span>{inr(p.amount)}</span>
                                <span className="ledger-pay-date">{fmtDateOnly(p.date)}{p.mode ? ` · ${p.mode}` : ''}</span>
                              </span>
                            ))
                          : <span className="ledger-nil">—</span>}
                      </td>
                      <td>
                        {r.runningBalance > 0
                          ? <span className="ledger-bal-owed">{inr(r.runningBalance)}</span>
                          : <span className="ledger-nil">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <PageLoader visible={loading} />
    </Layout>
  );
}
