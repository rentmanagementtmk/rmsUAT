import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { apiGet, apiPost } from '../lib/api';
import { BUILDINGS, HOUSES } from '../lib/houses';
import { useHouseCache } from '../lib/useHouseCache';
import { inr, formatDate, prevMonth } from '../lib/format';

interface ChargeLogRow { houseId: string; description: string; amount: number; forMonth: number; forYear: number; status: string; createdAt: string }

const LOG_PAGE_SIZE = 10;
const MONTHS = ['', 'month.1', 'month.2', 'month.3', 'month.4', 'month.5', 'month.6', 'month.7', 'month.8', 'month.9', 'month.10', 'month.11', 'month.12'];

export function MiscChargesPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { houseCache, isHouseActive } = useHouseCache();
  const initial = prevMonth();
  const currentYear = new Date().getFullYear();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [notify, setNotify] = useState(true);
  const [adding, setAdding] = useState(false);
  const [logs, setLogs] = useState<ChargeLogRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const offsetRef = useRef(0);

  const loadLogs = useCallback((reset: boolean) => {
    if (reset) offsetRef.current = 0;
    setLogLoading(true);
    apiGet<{ charges?: ChargeLogRow[]; hasMore?: boolean; error?: string }>({ action: 'getMiscCharges', offset: offsetRef.current, limit: LOG_PAGE_SIZE })
      .then((res) => {
        if (res.error) return;
        setLogs((prev) => (reset ? (res.charges || []) : [...prev, ...(res.charges || [])]));
        offsetRef.current += (res.charges || []).length;
        setHasMore(!!res.hasMore);
      })
      .catch(() => showToast(t('msg.network_error'), 'error'))
      .finally(() => setLogLoading(false));
  }, [showToast, t]);

  useEffect(() => { loadLogs(true); }, [loadLogs]);

  function toggleHouse(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(HOUSES.filter((h) => isHouseActive(h.id)).map((h) => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function resetForm() {
    setSelectedIds(new Set());
    setDescription('');
    setAmount('');
    setNotify(true);
    const p = prevMonth();
    setMonth(p.month); setYear(p.year);
  }

  async function handleAdd() {
    const houseIds = Array.from(selectedIds);
    if (houseIds.length === 0) return showToast(t('misc.no_house'), 'warning');
    const desc = description.trim();
    if (!desc) return showToast(t('misc.no_description'), 'warning');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return showToast(t('misc.invalid_amount'), 'error');

    setAdding(true);
    try {
      const res = await apiPost<{ error?: string }>({
        action: 'addMiscCharge', houseIds, description: desc, amount: amt,
        forYear: year, forMonth: month, notify,
      });
      if (res.error) { showToast(res.error, 'error'); return; }
      showToast(t('misc.added_success'), 'success');
      resetForm();
      loadLogs(true);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Layout title={t('misc.title')}>
      <section className="card">
        <div className="field">
          <label>{t('misc.select_houses')}</label>
          <label className="msg-phone-row">
            <input type="checkbox" checked={selectedIds.size > 0 && HOUSES.filter((h) => isHouseActive(h.id)).every((h) => selectedIds.has(h.id))}
              onChange={(e) => toggleSelectAll(e.target.checked)} />
            <span className="msg-phone-static">{t('misc.select_all')}</span>
          </label>
          <div id="misc-house-list">
            {BUILDINGS.map((b) => (
              <div className="msg-phones-wrap" key={b}>
                <label>{b}</label>
                {HOUSES.filter((h) => h.building === b).map((h) => {
                  const active = isHouseActive(h.id);
                  const tenant = houseCache[h.id]?.TenantName;
                  return (
                    <label className={`msg-phone-row${active ? '' : ' msg-phone-row--empty'}`} key={h.id}>
                      <input type="checkbox" className="misc-house-cb" disabled={!active}
                        checked={selectedIds.has(h.id)} onChange={(e) => toggleHouse(h.id, e.target.checked)} />
                      <span className="msg-phone-static">
                        {b} {h.displayNum}{tenant ? ` - ${tenant}` : ''}{active ? '' : ` — ${t('misc.vacant_label')}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="misc-description">{t('misc.description_label')}</label>
          <input type="text" id="misc-description" placeholder={t('misc.description_ph')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="misc-amount">{t('misc.amount_label')}</label>
          <input type="number" id="misc-amount" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="misc-month">{t('misc.month_label')}</label>
            <select id="misc-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.slice(1).map((key, i) => <option key={i + 1} value={i + 1}>{t(key)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="misc-year">{t('misc.year_label')}</label>
            <select id="misc-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="msg-phone-row">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span className="msg-phone-static">{t('misc.notify_label')}</span>
          </label>
        </div>

        <div className="btn-group">
          <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('misc.clear_btn')}</button>
          <button className="btn btn-primary" disabled={adding} onClick={handleAdd}>
            {adding ? t('misc.adding') : t('misc.add_btn')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">{t('misc.log_title')}</h3>
        <div id="misc-log-list">
          {logs.map((row, i) => {
            const houseEntry = HOUSES.find((h) => h.id === row.houseId);
            const houseName = houseEntry ? `${houseEntry.building} ${houseEntry.displayNum}` : row.houseId;
            return (
              <div className="msg-log-row" key={i}>
                <div className="msg-log-top">
                  <span className="msg-log-action">{houseName}</span>
                  <span className={`msg-log-status msg-log-status--${String(row.status).toLowerCase()}`}>{row.status}</span>
                </div>
                <div className="msg-log-details">{row.description} · {inr(row.amount)} · {t(MONTHS[row.forMonth])} {row.forYear}</div>
                <div className="msg-log-time">{formatDate(row.createdAt)}</div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button className="btn btn-secondary" disabled={logLoading} onClick={() => loadLogs(false)}>
            {logLoading ? t('msg.loading') : t('misc.show_more')}
          </button>
        )}
      </section>
    </Layout>
  );
}
