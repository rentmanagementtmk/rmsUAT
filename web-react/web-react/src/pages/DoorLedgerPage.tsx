import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { PageLoader } from '../components/PageLoader';
import { useLang } from '../lib/LangContext';
import { apiGet } from '../lib/api';
import { inr, fmtDateOnly } from '../lib/format';

interface DoorLedgerHouse { HouseID: string; DisplayName?: string; HouseLabel?: string; BuildingName?: string; TenantName?: string; OccupancyDate?: string }
interface DoorLedgerRow {
  month: number; year: number; expected: number; paid: number;
  payments?: { amount: number; date: string }[]; charges?: { amount: number; description: string }[];
}
interface DoorLedgerResponse {
  house: DoorLedgerHouse; rentPerMonth: number; outstanding: number; rows: DoorLedgerRow[]; error?: string;
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function DoorLedgerPage() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DoorLedgerResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError(t('door.invalid_link')); setLoading(false); return; }
    apiGet<DoorLedgerResponse>({ action: 'getDoorLedger', t: token })
      .then((res) => {
        if (res.error) { setError(t('door.invalid_link')); return; }
        setData(res);
      })
      .catch(() => setError(t('msg.net_check')))
      .finally(() => setLoading(false));
  }, [token, t]);

  return (
    <>
      <AppHeader title={t('door.title')} />
      <main>
        <div id="door-content">
          {error && <p className="msg-error">{error}</p>}
          {!error && data && (
            <>
              <div className="ledger-header-card house-card">
                <p className="house-building">{data.house.BuildingName}</p>
                <p className="house-name">
                  {data.house.DisplayName || data.house.HouseLabel}
                  {data.house.TenantName ? ` · ${data.house.TenantName}` : ''}
                </p>
                {data.house.OccupancyDate && <p className="house-rent">{t('ledger.since')} {fmtDateOnly(data.house.OccupancyDate)}</p>}
              </div>

              <div className="ledger-totals card">
                <div className="ledger-total-item">
                  <span>{t('door.rent_per_month')}</span>
                  <strong className="ledger-total-paid">{inr(data.rentPerMonth)}</strong>
                </div>
                <div className="ledger-total-divider"></div>
                <div className="ledger-total-item">
                  <span>{t('ledger.outstanding')}</span>
                  {data.outstanding > 0
                    ? <strong className="ledger-total-owed">{inr(data.outstanding)}</strong>
                    : <strong className="ledger-total-clear">✓ Clear</strong>}
                </div>
              </div>

              <div className="ledger-section">
                <p className="ledger-section-title">{t('door.payment_history')}</p>
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>{t('ledger.col_month')}</th>
                      <th>{t('ledger.col_expected')}</th>
                      <th>{t('ledger.col_paid')}</th>
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
                              ? r.payments.map((p, pi) => <span key={pi}>{inr(p.amount)}<span className="ledger-pay-date">{fmtDateOnly(p.date)}</span></span>)
                              : <span className="ledger-nil">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
      <PageLoader visible={loading} />
    </>
  );
}
