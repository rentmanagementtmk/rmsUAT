import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../lib/LangContext';
import { useToast } from '../lib/ToastContext';
import { apiPost } from '../lib/api';
import { setAuthSession } from '../lib/auth';
import { PageLoader } from '../components/PageLoader';

const LAST_PHONE_KEY = 'rms_last_phone';

export function LoginPage() {
  const { t, lang, toggleLang } = useLang();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState(() => localStorage.getItem(LAST_PHONE_KEY) || '');
  const [otp, setOtp] = useState('');
  const [remember, setRemember] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [channelNote, setChannelNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSendOtp() {
    // Strip any accidental 91/+91/spaces the user might paste, keep just the local 10-digit part
    const localNumber = phoneInput.replace(/[\s\-+]/g, '').replace(/^91/, '').replace(/^0+/, '');
    if (!localNumber) return showToast(t('auth.enter_phone'), 'warning');
    const phone = '91' + localNumber;
    setSending(true);
    setLoading(true);
    try {
      const res = await apiPost<{ error?: string; channel?: string }>({ action: 'requestLoginOtp', phone });
      if (res.error) { showToast(res.error, 'error'); return; }
      setCurrentPhone(phone);
      try { localStorage.setItem(LAST_PHONE_KEY, localNumber); } catch { /* ignore quota errors */ }
      setChannelNote(res.channel === 'email' ? t('auth.sent_via_email') : t('auth.sent_via_whatsapp'));
      setStep('otp');
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setLoading(false);
      setSending(false);
    }
  }

  async function handleVerify() {
    const code = otp.trim();
    if (!code) return showToast(t('auth.enter_otp'), 'warning');
    setVerifying(true);
    setLoading(true);
    try {
      const res = await apiPost<{ error?: string; token: string; name: string; role: string }>({
        action: 'verifyLoginOtp',
        phone: currentPhone,
        code,
        rememberMe: remember,
      });
      if (res.error) { showToast(res.error, 'error'); return; }
      setAuthSession(res.token, { name: res.name, role: res.role }, remember);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">🏠</span>
          <span className="header-title">RMS</span>
        </div>
        <div className="header-actions">
          <button
            className={`lang-btn ${lang === 'kn' ? 'lang-kn-active' : 'lang-en-active'}`}
            aria-label="Switch language"
            onClick={toggleLang}
          >
            <span className="lang-seg lang-en">E</span>
            <span className="lang-seg lang-kn">ಕ</span>
          </button>
        </div>
      </header>

      <main>
        <section className="scan-prompt card">
          <span className="scan-icon">🔐</span>
          <h2>{t('auth.title')}</h2>
          <p>{t('auth.subtitle')}</p>
        </section>

        {step === 'phone' && (
          <section className="card">
            <div className="field">
              <label htmlFor="login-phone">{t('auth.phone_label')}</label>
              <div className="phone-input-group">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  id="login-phone"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSendOtp} disabled={sending}>
              {sending ? t('auth.sending') : t('auth.send_otp')}
            </button>
          </section>
        )}

        {step === 'otp' && (
          <section className="card">
            <p className="auth-channel-note">{channelNote}</p>
            <div className="field">
              <label htmlFor="login-otp">{t('auth.otp_label')}</label>
              <input
                type="text"
                id="login-otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <label className="msg-phone-row">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>{t('auth.remember_me')}</span>
            </label>
            <div className="btn-group">
              <button type="button" className="btn btn-secondary" onClick={() => { setStep('phone'); setOtp(''); }}>
                {t('auth.change_number')}
              </button>
              <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
                {verifying ? t('auth.verifying') : t('auth.verify_btn')}
              </button>
            </div>
          </section>
        )}
      </main>

      <PageLoader visible={loading} />
    </>
  );
}
