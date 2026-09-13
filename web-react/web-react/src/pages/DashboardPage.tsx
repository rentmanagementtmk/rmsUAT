import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { apiGet } from '../lib/api';
import { BUILDINGS, HOUSES, houseSelectOption } from '../lib/houses';
import { useHouseCache } from '../lib/useHouseCache';
import { inr, formatDate, prevMonth } from '../lib/format';

interface DashRecord {
  HouseID: string; RentForMonth: number; RentForYear: number; AmountReceived: number;
  CollectedDate: string; NotificationSent?: string;
}
interface IncrementInfo { effectiveDate: string; newRent: number; increment?: number }
interface BalanceEntry {
  balance?: number; expectedRent?: number; futureOccupancy?: string;
  upcomingIncrement?: IncrementInfo; recentIncrement?: IncrementInfo; nextIncrementDate?: string;
}
type Balances = Record<string, BalanceEntry>;
interface ValidateIssue { house: string; code: string; value?: string }
interface ValidateResult { passed: number; issues: ValidateIssue[]; warnings: ValidateIssue[] }

type WidgetType = 'overdue' | 'increment' | 'failed';

function notifFailed(status?: string): boolean {
  return status !== 'SENT' && status !== '' && status != null;
}

function BalDot({ balance, expectedRent, isVacant }: { balance: number; expectedRent: number; isVacant: boolean }) {
  const { t } = useLang();
  const today = new Date();
  if (isVacant) return <span className="bal-dot tip dot-orange" data-tip={t('dot.vacant')}></span>;
  if (balance === 0) return <span className="bal-dot tip dot-green" data-tip={t('dot.paid')}></span>;
  if (today.getDate() <= 10) return null;
  if (expectedRent > 0 && balance >= 2 * expectedRent) return <span className="bal-dot tip dot-red" data-tip={t('dot.overdue')}></span>;
  if (expectedRent > 0 && balance < 2 * expectedRent) return <span className="bal-dot tip dot-yellow" data-tip={t('dot.due')}></span>;
  return null;
}

export function DashboardPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { houseCache } = useHouseCache();
  const initP = prevMonth();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>(initP.month);
  const [houseFilter, setHouseFilter] = useState('');
  const [records, setRecords] = useState<DashRecord[]>([]);
  const [balances, setBalances] = useState<Balances>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const forceRefreshRef = useRef(false);

  const load = useCallback(() => {
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setLoading(true);
    setErrorMsg('');
    const params: Record<string, string | number | boolean> = { action: 'getDashboardData', year };
    if (month) params.month = month;
    if (houseFilter && !houseFilter.startsWith('BLDG:')) params.houseId = houseFilter;
    if (forceRefresh) params.forceRefresh = '1';
    params.balMonth = month || new Date().getMonth() + 1;
    apiGet<{ records?: DashRecord[]; balances?: Balances; error?: string }>(params, { forceRefresh })
      .then((res) => {
        if (res.error) { setErrorMsg(res.error); return; }
        setRecords(res.records || []);
        setBalances(res.balances || {});
      })
      .catch(() => setErrorMsg(t('msg.net_check')))
      .finally(() => setLoading(false));
  }, [year, month, houseFilter, t]);

  useEffect(() => { load(); }, [load]);

  function onFilterChange(fn: () => void) {
    fn();
    setActiveWidget(null);
  }

  function houseIdsForWidget(type: WidgetType): string[] {
    const today = new Date();
    if (type === 'overdue') {
      return Object.entries(balances)
        .filter(([, b]) => !b.futureOccupancy && (b.expectedRent || 0) > 0 && today.getDate() > 10 && (b.balance || 0) >= 2 * (b.expectedRent || 0))
        .map(([id]) => id);
    }
    if (type === 'increment') {
      return Object.entries(balances).filter(([, b]) => b.upcomingIncrement || b.recentIncrement).map(([id]) => id);
    }
    const ids = new Set<string>();
    records.forEach((r) => { if (notifFailed(r.NotificationSent)) ids.add(r.HouseID); });
    return [...ids];
  }

  const widgets = useMemo(() => {
    const defs: { type: WidgetType; icon: string; labelKey: string }[] = [
      { type: 'overdue', icon: '🔴', labelKey: 'dashboard.widget_overdue' },
      { type: 'increment', icon: '⬆️', labelKey: 'dashboard.widget_increment' },
      { type: 'failed', icon: '🔕', labelKey: 'dashboard.widget_failed' },
    ];
    return defs.map((w) => ({ ...w, ids: houseIdsForWidget(w.type) })).filter((w) => w.ids.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, records]);

  function toggleWidget(type: WidgetType) {
    if (activeWidget === type) {
      setActiveWidget(null);
      setHouseFilter('');
    } else {
      const ids = houseIdsForWidget(type);
      if (!ids.length) return;
      setActiveWidget(type);
      setHouseFilter(ids.length === 1 ? ids[0] : '');
    }
  }
  const activeWidgetIds = activeWidget ? new Set(houseIdsForWidget(activeWidget)) : null;

  function handleRefresh() {
    setRefreshing(true);
    forceRefreshRef.current = true;
    const p = prevMonth();
    setYear(p.year); setMonth(p.month); setHouseFilter(''); setActiveWidget(null);
    setTimeout(() => setRefreshing(false), 800);
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await apiGet<ValidateResult>({ action: 'validateMasters' });
      setValidateResult(res);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setValidating(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await apiGet<{ succeeded: number; retried: number }>({ action: 'retryDisconnected' });
      showToast(`${res.succeeded}/${res.retried} ${t('msg.notif_retried')}`, res.succeeded > 0 ? 'success' : 'warning');
      load();
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setRetrying(false);
    }
  }

  const byHouse: Record<string, DashRecord[]> = {};
  records.forEach((r) => { (byHouse[r.HouseID] = byHouse[r.HouseID] || []).push(r); });

  const isBldgFilter = houseFilter.startsWith('BLDG:');
  const targetBuilding = isBldgFilter ? houseFilter.slice(5) : (houseFilter ? HOUSES.find((h) => h.id === houseFilter)?.building : null);
  const isMonthSelected = !!month;

  let grandTotal = 0;
  const buildingCards: { building: string; total: number; rowsHtml: React.ReactNode[] }[] = [];

  BUILDINGS.forEach((building) => {
    if (targetBuilding && building !== targetBuilding) return;
    let buildingTotal = 0;
    const rows: React.ReactNode[] = [];

    HOUSES.filter((h) => h.building === building).forEach((h) => {
      if (houseFilter && !isBldgFilter && h.id !== houseFilter) return;
      if (activeWidgetIds && !activeWidgetIds.has(h.id)) return;

      const payments = byHouse[h.id] || [];
      const bEntry = balances[h.id] || {};
      const isFuture = !!bEntry.futureOccupancy;
      const isVacant = !balances[h.id] && !isFuture;
      const rowClasses = ['house-row', payments.length ? 'paid' : 'unpaid', isFuture ? 'future-house' : '', isVacant ? 'vacant' : ''].filter(Boolean).join(' ');
      const tenant = houseCache[h.id]?.TenantName || '';
      const inc = bEntry.upcomingIncrement || null;
      const notifInc = !inc ? bEntry.recentIncrement || null : null;
      const incIcon = inc
        ? <span className="tip" data-tip={t('tip.increment')}>⬆️</span>
        : notifInc ? <span className="tip" data-tip={t('tip.increment_notified')}>📩</span> : null;
      const incLine = inc
        ? <span className="row-sub row-increment">{t('msg.increment_detail').replace('{rent}', inr(inc.newRent)).replace('{date}', inc.effectiveDate).replace('{inc}', inr(inc.increment || 0))}</span>
        : notifInc
          ? <span className="row-sub row-increment-notified">{t('msg.increment_notified').replace('{rent}', inr(notifInc.newRent)).replace('{date}', notifInc.effectiveDate)}</span>
          : null;

      if (payments.length === 0) {
        const bal = bEntry.balance || 0;
        rows.push(
          <a href={`/ledger?house=${h.id}`} className={rowClasses} key={h.id}>
            <div className="row-info">
              <span className="row-label">
                {building} {h.displayNum}{tenant ? ` - ${tenant}` : ''} {incIcon} {!isFuture && <BalDot balance={bal} expectedRent={bEntry.expectedRent || 0} isVacant={isVacant} />}
              </span>
              {isFuture
                ? <span className="row-sub">{t('msg.prebooked')} {bEntry.futureOccupancy}</span>
                : bal > 0 && <span className="row-sub row-balance">{t('msg.balance')} {inr(bal)}</span>}
              {incLine}
            </div>
            <span className="row-amount no-pay row-chevron">›</span>
          </a>
        );
      } else if (isMonthSelected && payments.length > 1) {
        const total = payments.reduce((s, p) => s + p.AmountReceived, 0);
        buildingTotal += total; grandTotal += total;
        const bell = payments.some((p) => notifFailed(p.NotificationSent)) ? <span className="tip" data-tip={t('tip.notif_failed')}>🔕</span> : null;
        const histBal = bEntry.balance || 0;
        rows.push(
          <a href={`/ledger?house=${h.id}`} className={`${rowClasses} dup-entry`} key={h.id}>
            <div className="row-info">
              <span className="row-label">
                {building} {h.displayNum}{tenant ? ` - ${tenant}` : ''} <span className="tip" data-tip={t('tip.duplicate')}>⚠️</span> {bell} {incIcon} <BalDot balance={histBal} expectedRent={bEntry.expectedRent || 0} isVacant={false} />
              </span>
              <span className="row-sub">{t('month.' + payments[0].RentForMonth)} {payments[0].RentForYear} · {payments.length} {t('msg.payments')}</span>
              {histBal > 0 && <span className="row-sub row-balance">{t('msg.balance')} {inr(histBal)}</span>}
              {incLine}
              <div className="dup-splits">
                {payments.map((p, i) => (
                  <div className="dup-split" key={i}>
                    <span className="split-amount">{inr(p.AmountReceived)}</span>
                    <span className="split-date">{formatDate(p.CollectedDate)}</span>
                  </div>
                ))}
              </div>
            </div>
            <span className="row-amount">{inr(total)} <span className="row-chevron">›</span></span>
          </a>
        );
      } else {
        payments.forEach((p, i) => {
          buildingTotal += p.AmountReceived; grandTotal += p.AmountReceived;
          const bell = notifFailed(p.NotificationSent) ? <span className="tip" data-tip={t('tip.notif_failed')}>🔕</span> : null;
          const histBal = bEntry.balance || 0;
          rows.push(
            <a href={`/ledger?house=${h.id}`} className={rowClasses} key={`${h.id}-${i}`}>
              <div className="row-info">
                <span className="row-label">
                  {building} {h.displayNum}{tenant ? ` - ${tenant}` : ''} {bell} {incIcon} <BalDot balance={histBal} expectedRent={bEntry.expectedRent || 0} isVacant={false} />
                </span>
                <span className="row-sub">{t('month.' + p.RentForMonth)} {p.RentForYear}</span>
                <span className="row-date">{formatDate(p.CollectedDate)}</span>
                {histBal > 0 && <span className="row-sub row-balance">{t('msg.balance')} {inr(histBal)}</span>}
                {incLine}
              </div>
              <span className="row-amount">{inr(p.AmountReceived)} <span className="row-chevron">›</span></span>
            </a>
          );
        });
      }
    });

    if (rows.length) buildingCards.push({ building, total: buildingTotal, rowsHtml: rows });
  });

  const hasRetryable = records.some((r) => notifFailed(r.NotificationSent));
  const periodLabel = month ? `${t('month.' + month)} ${year}` : `${t('msg.all_of')} ${year}`;

  return (
    <Layout title="RMS">
      <section className="filters card">
        <div className="filter-title-row">
          <h3 className="section-title">{t('dashboard.filter')}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="validate-btn tip" data-tip={t('tip.validate')} disabled={validating} onClick={handleValidate}>{validating ? '⏳' : '📋'}</button>
            <button className="validate-btn tip" data-tip={t('tip.refresh')} disabled={refreshing} onClick={handleRefresh}>{refreshing ? '⏳' : '🔄'}</button>
            {hasRetryable && (
              <button className="retry-notif-btn" disabled={retrying} onClick={handleRetry}>{retrying ? '…' : t('dashboard.retry_btn')}</button>
            )}
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="filter-year">{t('dashboard.year_label')}</label>
            <select id="filter-year" value={year} onChange={(e) => onFilterChange(() => setYear(Number(e.target.value)))}>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-month">{t('dashboard.month_label')}</label>
            <select id="filter-month" value={month} onChange={(e) => onFilterChange(() => setMonth(e.target.value ? Number(e.target.value) : ''))}>
              <option value="">{t('dashboard.all_months')}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{t('month.' + m)}</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filter-house">{t('dashboard.house_label')}</label>
          <select id="filter-house" value={houseFilter} onChange={(e) => onFilterChange(() => setHouseFilter(e.target.value))}>
            <option value="">{t('dashboard.all_houses')}</option>
            {BUILDINGS.map((b) => (
              <optgroup key={b} label={b}>
                <option value={`BLDG:${b}`}>{t('dashboard.all_building').replace('{name}', b).replace('{count}', String(HOUSES.filter((h) => h.building === b).length))}</option>
                {HOUSES.filter((h) => h.building === b).map((h) => {
                  const opt = houseSelectOption(h, houseCache[h.id]);
                  return <option key={h.id} value={h.id} disabled={opt.disabled}>{opt.label}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </section>

      {widgets.length > 0 && (
        <div id="priority-strip">
          <div className="priority-strip">
            {widgets.map((w) => (
              <button key={w.type} className={`priority-pill priority-pill--${w.type}${activeWidget === w.type ? ' active' : ''}`} onClick={() => toggleWidget(w.type)}>
                <span className="pp-count">{w.ids.length} <span className="pp-icon">{w.icon}</span></span>
                <span className="pp-label">{t(w.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>{t('dashboard.loading')}</span>
        </div>
      )}

      {!loading && errorMsg && <p className="msg-error">{errorMsg}</p>}

      {!loading && !errorMsg && (
        <div id="results">
          {buildingCards.length === 0
            ? <p className="msg-empty">{t('msg.no_records')}</p>
            : (
              <>
                <div className="summary-bar">
                  <div>
                    <div className="summary-label">{t('dashboard.total')}</div>
                    <div className="summary-period">{periodLabel}</div>
                  </div>
                  <div className="summary-amount">{inr(grandTotal)}</div>
                </div>
                {buildingCards.map((bc) => (
                  <div className="building-card" key={bc.building}>
                    <div className="building-head">
                      <span>{bc.building}</span>
                      <span className="building-total">{inr(bc.total)}</span>
                    </div>
                    <div className="building-rows">{bc.rowsHtml}</div>
                  </div>
                ))}
              </>
            )}
        </div>
      )}

      {validateResult && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <p className="modal-title">{t('validate.title')}</p>
            <div className="modal-scroll-body">
              <div className="val-summary">
                ✅ {validateResult.passed} {t('validate.passed')} ❌ {validateResult.issues.length} {t('validate.issues_count')} ⚠️ {validateResult.warnings.length} {t('validate.warnings_count')}
              </div>
              {validateResult.issues.length > 0 && (
                <>
                  <p className="val-section-label">{t('validate.issues')}</p>
                  <ul className="val-list">
                    {validateResult.issues.map((item, i) => (
                      <li key={i}><strong>{item.house}:</strong> {t('validate.err.' + item.code).replace('{value}', item.value || '')}</li>
                    ))}
                  </ul>
                </>
              )}
              {validateResult.warnings.length > 0 && (
                <>
                  <p className="val-section-label">{t('validate.warnings')}</p>
                  <ul className="val-list">
                    {validateResult.warnings.map((item, i) => (
                      <li key={i}><strong>{item.house}:</strong> {t('validate.err.' + item.code).replace('{value}', item.value || '')}</li>
                    ))}
                  </ul>
                </>
              )}
              {validateResult.issues.length === 0 && validateResult.warnings.length === 0 && (
                <p className="val-ok">{t('validate.all_ok')}</p>
              )}
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => setValidateResult(null)}>{t('validate.close')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
