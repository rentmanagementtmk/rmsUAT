import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { useLang } from '../lib/LangContext';
import { apiGet } from '../lib/api';
import { HOUSES } from '../lib/houses';
import { useHouseCache } from '../lib/useHouseCache';
import { inr, fmtDateOnly, prevMonth } from '../lib/format';

const REPORT_ORDER = ['Spatika', 'Manikya', 'Jalanidhi', 'Vaidurya', 'Aparanji'];

interface DashRecord { HouseID: string; RentForMonth: number; RentForYear: number; AmountReceived: number; CollectedDate: string }
interface IncrementInfo { effectiveDate: string }
interface BalanceEntry { balance?: number; expectedRent?: number; futureOccupancy?: string; upcomingIncrement?: IncrementInfo; nextIncrementDate?: string }
type Balances = Record<string, BalanceEntry>;

export function ReportPage() {
  const { t } = useLang();
  useHouseCache();
  const init = prevMonth();
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DashRecord[]>([]);
  const [balances, setBalances] = useState<Balances>({});
  const [errorMsg, setErrorMsg] = useState('');

  const now = new Date();
  const maxYear = now.getFullYear();
  const maxMonth = now.getMonth() + 1;
  const isAtMax = year === maxYear && month === maxMonth;

  const load = useCallback((m: number, y: number) => {
    setLoading(true);
    setErrorMsg('');
    apiGet<{ records?: DashRecord[]; balances?: Balances; error?: string }>({ action: 'getDashboardData', year: y, month: m, balMonth: m })
      .then((res) => {
        if (res.error) { setErrorMsg(res.error); return; }
        setRecords(res.records || []);
        setBalances(res.balances || {});
      })
      .catch(() => setErrorMsg(t('msg.net_check')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(month, year); }, [month, year, load]);

  function goPrev() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else { setMonth((m) => m - 1); }
  }
  function goNext() {
    if (isAtMax) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else { setMonth((m) => m + 1); }
  }

  const byHouse: Record<string, DashRecord[]> = {};
  records.forEach((r) => { (byHouse[r.HouseID] = byHouse[r.HouseID] || []).push(r); });

  return (
    <Layout title="RMS" headerActions={
      <span className="report-month-badge">
        <button className="report-nav-btn" aria-label="Previous month" onClick={goPrev}>&#8249;</button>
        <span>{t('month.' + month)} {year}</span>
        <button className="report-nav-btn" aria-label="Next month" disabled={isAtMax} onClick={goNext}>&#8250;</button>
      </span>
    }>
      {errorMsg && <p className="msg-error">{errorMsg}</p>}
      {!errorMsg && (
        <div id="report-content">
          {REPORT_ORDER.map((building) => {
            const houses = HOUSES.filter((h) => h.building === building);
            return (
              <div className="report-section" key={building}>
                <div className="report-building-title">{building.toUpperCase()}</div>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{t('report.col_house')}</th>
                        <th>{t('report.col_rent')}</th>
                        <th>{t('report.col_paid')}</th>
                        <th>{t('report.col_balance')}</th>
                        <th>{t('report.col_increment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {houses.map((h) => {
                        const bEntry = balances[h.id] || {};
                        const isVacant = !balances[h.id] && !bEntry.futureOccupancy;
                        if (isVacant) {
                          return (
                            <tr className="report-row-vacant" key={h.id}>
                              <td>{h.displayNum} <span className="report-vacant-tag">{t('report.vacant')}</span></td>
                              <td>—</td><td>—</td><td>—</td><td>—</td>
                            </tr>
                          );
                        }
                        const paid = (byHouse[h.id] || []).filter((p) => p.RentForMonth === month && p.RentForYear === year);
                        const totalPaid = paid.reduce((s, p) => s + Number(p.AmountReceived || 0), 0);
                        const bal = bEntry.balance || 0;
                        const thisRent = bEntry.expectedRent || 0;
                        const prevBal = Math.max(0, bal + totalPaid - thisRent);
                        const isPartial = totalPaid > 0 && totalPaid < thisRent;
                        const paidClass = isPartial ? 'report-cell-partial' : totalPaid > 0 ? 'report-cell-paid' : 'report-cell-nil';
                        const sortedPaid = [...paid].sort((a, b) => new Date(a.CollectedDate).getTime() - new Date(b.CollectedDate).getTime());
                        const inc = bEntry.upcomingIncrement;

                        return (
                          <tr key={h.id}>
                            <td>{h.displayNum}</td>
                            {thisRent
                              ? (prevBal > 0
                                ? <td className="report-cell-rent-detail">
                                    <span className="report-rent-prev">{inr(prevBal)}</span>
                                    <span className="report-rent-add">+ {inr(thisRent)}</span>
                                    <span className="report-rent-total">= {inr(prevBal + thisRent)}</span>
                                  </td>
                                : <td>{inr(thisRent)}</td>)
                              : <td className="report-cell-nil">—</td>}
                            {sortedPaid.length
                              ? <td className={paidClass}>
                                  {sortedPaid.map((p, i) => (
                                    <span key={i}>{inr(p.AmountReceived)}<br /><span className="report-paid-date">{fmtDateOnly(p.CollectedDate)}</span>{i < sortedPaid.length - 1 ? <br /> : null}</span>
                                  ))}
                                </td>
                              : <td className="report-cell-nil">—</td>}
                            {bal > 0 ? <td className="report-cell-balance">{inr(bal)}</td> : <td className="report-cell-nil">—</td>}
                            {inc
                              ? <td className="report-cell-increment">⬆️ {inc.effectiveDate}</td>
                              : bEntry.nextIncrementDate
                                ? <td className="report-cell-inc-future">{bEntry.nextIncrementDate}</td>
                                : <td className="report-cell-nil">—</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PageLoader visible={loading} />
    </Layout>
  );
}
