import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { apiGet, apiPost } from '../lib/api';
import { BUILDINGS, HOUSES, houseSelectOption } from '../lib/houses';
import { useHouseCache } from '../lib/useHouseCache';
import { formatDate } from '../lib/format';

interface MsgHouse { HouseID: string; Phone1?: string; Phone2?: string }
interface LogRow { action: string; status: string; details: string; timestamp: string }

const ACTION_LABEL_KEYS: Record<string, string> = {
  RENT_SAVED: 'messenger.action_rent_saved',
  RENT_REMINDER: 'messenger.action_rent_reminder',
  INCREMENT_NOTICE: 'messenger.action_increment_notice',
  CUSTOM_MSG: 'messenger.action_custom_msg',
  MISC_CHARGE: 'messenger.action_misc_charge',
};

const LOG_PAGE_SIZE = 10;

export function MessengerPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { houseCache } = useHouseCache();
  const [houseId, setHouseId] = useState('');
  const [currentHouse, setCurrentHouse] = useState<MsgHouse | null>(null);
  const [p1Checked, setP1Checked] = useState(false);
  const [p2Checked, setP2Checked] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHouse, setLoadingHouse] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const offsetRef = useRef(0);

  const loadLogs = useCallback((reset: boolean, filterHouseId: string) => {
    if (reset) offsetRef.current = 0;
    setLogLoading(true);
    apiGet<{ logs?: LogRow[]; hasMore?: boolean; error?: string }>({
      action: 'getMessageLogs', offset: offsetRef.current, limit: LOG_PAGE_SIZE,
      ...(filterHouseId ? { houseId: filterHouseId } : {}),
    })
      .then((res) => {
        if (res.error) return;
        setLogs((prev) => (reset ? (res.logs || []) : [...prev, ...(res.logs || [])]));
        offsetRef.current += (res.logs || []).length;
        setHasMore(!!res.hasMore);
      })
      .catch(() => showToast(t('msg.network_error'), 'error'))
      .finally(() => setLogLoading(false));
  }, [showToast, t]);

  useEffect(() => { loadLogs(true, ''); }, [loadLogs]);

  async function handleHouseChange(id: string) {
    setHouseId(id);
    if (!id) {
      setCurrentHouse(null);
      setP1Checked(false); setP2Checked(false);
      loadLogs(true, '');
      return;
    }
    setLoadingHouse(true);
    try {
      const res = await apiGet<{ house?: MsgHouse; error?: string }>({ action: 'getHouse', qr: id });
      if (res.error || !res.house) { showToast(t('msg.house_not_found'), 'error'); return; }
      setCurrentHouse(res.house);
      setP1Checked(!!res.house.Phone1);
      setP2Checked(!!res.house.Phone2);
      loadLogs(true, res.house.HouseID);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setLoadingHouse(false);
    }
  }

  async function handleSend() {
    if (!currentHouse) return showToast(t('msg.select_house'), 'warning');
    const msg = message.trim();
    if (!msg) return showToast(t('messenger.empty_message'), 'warning');
    if (!p1Checked && !p2Checked) return showToast(t('messenger.no_recipient'), 'warning');
    setSending(true);
    try {
      const res = await apiPost<{ error?: string }>({
        action: 'sendCustomMessage', houseId: currentHouse.HouseID,
        sendToPhone1: p1Checked, sendToPhone2: p2Checked, message: msg,
      });
      if (res.error) { showToast(res.error, 'error'); return; }
      showToast(t('messenger.sent_success'), 'success');
      setMessage('');
      loadLogs(true, currentHouse.HouseID);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setSending(false);
    }
  }

  function handleClear() {
    setHouseId(''); setCurrentHouse(null);
    setP1Checked(false); setP2Checked(false);
    setMessage('');
    loadLogs(true, '');
  }

  return (
    <Layout title={t('messenger.title')}>
      <section className="card">
        <div className="field">
          <label htmlFor="msg-house-select">{t('messenger.select_house')}</label>
          <select id="msg-house-select" value={houseId} onChange={(e) => handleHouseChange(e.target.value)}>
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

        <div className="msg-phones-wrap">
          <label>{t('messenger.recipients')}</label>
          <label className="msg-phone-row">
            <input type="checkbox" checked={p1Checked} disabled={!currentHouse?.Phone1} onChange={(e) => setP1Checked(e.target.checked)} />
            <span className="msg-phone-static">{t('messenger.phone1_label')}</span>
            <span>{currentHouse?.Phone1 || '—'}</span>
          </label>
          <label className="msg-phone-row">
            <input type="checkbox" checked={p2Checked} disabled={!currentHouse?.Phone2} onChange={(e) => setP2Checked(e.target.checked)} />
            <span className="msg-phone-static">{t('messenger.phone2_label')}</span>
            <span>{currentHouse?.Phone2 || '—'}</span>
          </label>
        </div>

        <div className="field">
          <label htmlFor="msg-text">{t('messenger.message_label')}</label>
          <textarea id="msg-text" rows={4} placeholder={t('messenger.message_ph')} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="btn-group">
          <button type="button" className="btn btn-secondary" onClick={handleClear}>{t('messenger.clear_btn')}</button>
          <button className="btn btn-primary" disabled={sending} onClick={handleSend}>
            {sending ? t('messenger.sending') : t('messenger.send_btn')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">{t('messenger.log_title')}</h3>
        <div id="msg-log-list">
          {logs.map((row, i) => (
            <div className="msg-log-row" key={i}>
              <div className="msg-log-top">
                <span className="msg-log-action">{t(ACTION_LABEL_KEYS[row.action] || row.action)}</span>
                <span className={`msg-log-status msg-log-status--${String(row.status).toLowerCase()}`}>{row.status}</span>
              </div>
              <div className="msg-log-details">{row.details}</div>
              <div className="msg-log-time">{formatDate(row.timestamp)}</div>
            </div>
          ))}
        </div>
        {hasMore && (
          <button className="btn btn-secondary" disabled={logLoading} onClick={() => loadLogs(false, houseId ? currentHouse?.HouseID || '' : '')}>
            {logLoading ? t('msg.loading') : t('messenger.show_more')}
          </button>
        )}
      </section>
      <PageLoader visible={loadingHouse} />
    </Layout>
  );
}
