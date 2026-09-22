import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MarketValueCalculatorJourney } from './MarketValueCalculatorJourney';
import { Mail, User, Lock, FileText, Shield, Fingerprint } from 'lucide-react';
import { logAcceptance, getActiveDocuments, AcceptanceData } from '../../lib/legal';

type Lang = 'ru' | 'en' | 'kk' | 'az';

const copy = {
  ru: { telegram: 'Telegram', telegramHint: 'Username строго через @', telegramInvalid: 'Укажите Telegram в формате @username.', title: 'Регистрация в калькуляторе', subtitle: 'Сначала создадим твой профиль. После регистрации откроется расчёт рыночной стоимости.', name: 'Имя', email: 'Email', password: 'Пароль', button: 'Зарегистрироваться', login: 'Уже есть профиль? Войти', error: 'Не удалось зарегистрировать профиль.', short: 'Пароль должен содержать минимум 6 символов.', success: 'Профиль создан. Проверь почту и подтверди email, затем войди в калькулятор.', resend: 'Отправить письмо подтверждения ещё раз', resent: 'Письмо подтверждения отправлено повторно.', required: 'Заполни все поля.', consentTitle: 'Согласия', consentTos: 'Я принимаю Условия использования', consentPrivacy: 'Я принимаю Политику конфиденциальности', consentPd: 'Я даю согласие на обработку персональных данных', consentBio: 'Я даю согласие на обработку биометрических данных', consentBioNote: 'Биометрическое согласие не требуется для регистрации.', viewDocument: 'Документ', consentRequired: 'Для регистрации необходимо принять обязательные согласия.' },
  en: { telegram: 'Telegram', telegramHint: 'Username with @', telegramInvalid: 'Enter Telegram as @username.', title: 'Calculator registration', subtitle: 'First, let’s create your profile. After registration, the market value calculator will open.', name: 'Name', email: 'Email', password: 'Password', button: 'Create profile', login: 'Already have a profile? Sign in', error: 'Could not create the profile.', short: 'Password must contain at least 6 characters.', success: 'Your profile was created. Check your email, confirm the address, then sign in to the calculator.', resend: 'Resend confirmation email', resent: 'The confirmation email was sent again.', required: 'Please fill in all fields.', consentTitle: 'Consents', consentTos: 'I accept the Terms of Use', consentPrivacy: 'I accept the Privacy Policy', consentPd: 'I consent to personal data processing', consentBio: 'I consent to biometric data processing', consentBioNote: 'Biometric consent is not required for registration.', viewDocument: 'Document', consentRequired: 'Required consents must be accepted.' },
  kk: { telegram: 'Telegram', telegramHint: 'Username-ді @ арқылы енгізіңіз', telegramInvalid: 'Telegram-ды @username форматында енгізіңіз.', title: 'Калькуляторға тіркелу', subtitle: 'Алдымен профиліңді жасаймыз. Тіркелгеннен кейін нарықтық құн калькуляторы ашылады.', name: 'Аты', email: 'Email', password: 'Құпиясөз', button: 'Профиль жасау', login: 'Профиль бар ма? Кіру', error: 'Профильді жасау мүмкін болмады.', short: 'Құпиясөз кемінде 6 таңбадан тұруы керек.', success: 'Профиль жасалды. Поштаңды тексеріп, email-ді раста, содан кейін калькуляторға кір.', resend: 'Растау хатын қайта жіберу', resent: 'Растау хаты қайта жіберілді.', required: 'Барлық жолды толтыр.', consentTitle: 'Келісімдер', consentTos: 'Пайдалану шарттарын қабылдаймын', consentPrivacy: 'Құпиялылық саясатын қабылдаймын', consentPd: 'Жеке деректерді өңдеуге келісемін', consentBio: 'Биометриялық деректерді өңдеуге келісемін', consentBioNote: 'Биометриялық келісім тіркелу үшін міндетті емес.', viewDocument: 'Құжат', consentRequired: 'Міндетті келісімдерді қабылдау қажет.' },
  az: { telegram: 'Telegram', telegramHint: 'Username @ ilə', telegramInvalid: 'Telegram-ı @username formatında daxil edin.', title: 'Kalkulyatorda qeydiyyat', subtitle: 'Əvvəlcə profilini yaradaq. Qeydiyyatdan sonra bazar dəyəri kalkulyatoru açılacaq.', name: 'Ad', email: 'Email', password: 'Şifrə', button: 'Profil yarat', login: 'Artıq profilin var? Daxil ol', error: 'Profil yaratmaq mümkün olmadı.', short: 'Şifrə ən azı 6 simvol olmalıdır.', success: 'Profil yaradıldı. Email-i yoxla və ünvanı təsdiqlə, sonra kalkulyatora daxil ol.', resend: 'Təsdiq məktubunu yenidən göndər', resent: 'Təsdiq məktubu yenidən göndərildi.', required: 'Bütün sahələri doldur.', consentTitle: 'Razılıqlar', consentTos: 'İstifadə şərtlərini qəbul edirəm', consentPrivacy: 'Məxfilik siyasətini qəbul edirəm', consentPd: 'Şəxsi məlumatların işlənməsinə razıyam', consentBio: 'Biometrik məlumatların işlənməsinə razıyam', consentBioNote: 'Biometrik razılıq qeydiyyat üçün məcburi deyil.', viewDocument: 'Sənəd', consentRequired: 'Məcburi razılıqlar qəbul edilməlidir.' },
} as const;

export function MarketValueEntryPage() {
  const { user, loading } = useAuth();
  const [lang, setLang] = useState<Lang>('ru');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [consentTos, setConsentTos] = useState(false), [consentPrivacy, setConsentPrivacy] = useState(false), [consentPd, setConsentPd] = useState(false), [consentBio, setConsentBio] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('incore-lang') as Lang | null;
    if (stored && stored in copy) setLang(stored);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#000052]">Загрузка...</div>;
  if (user) return <MarketValueCalculatorJourney />;

  const c = copy[lang];
  const go = (path: string) => {
    if (path === '/login') localStorage.setItem('incore-b2c-login-intent', '1');
    window.location.replace(`${window.location.origin}/#${path}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!name.trim() || !email.trim() || !telegram.trim() || !password) {
      setMessageType('error');
      setMessage(c.required);
      return;
    }
    if (!consentTos || !consentPrivacy || !consentPd) { setMessageType('error'); setMessage(c.consentRequired); return; }
    if (!/^@[A-Za-z0-9_]{5,32}$/.test(telegram.trim())) {
      setMessageType('error');
      setMessage(c.telegramInvalid);
      return;
    }
    if (password.length < 6) {
      setMessageType('error');
      setMessage(c.short);
      return;
    }

    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            profile_type: 'b2c_calculator',
            telegram: telegram.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error(c.error);
      const docs = await getActiveDocuments(lang);
      const requiredTypes = ['tos', 'privacy_policy', 'consent_pd'] as const;
      const acceptances: AcceptanceData[] = requiredTypes.map(document_type => { const d = docs.find(x => x.document_type === document_type); return { document_type, document_id: d?.id, document_version: d?.version, document_hash: d?.sha256_hash, acceptance_method: 'registration' }; });
      if (consentBio) { const d = docs.find(x => x.document_type === 'consent_bio'); if (d) acceptances.push({ document_type: 'consent_bio', document_id: d.id, document_version: d.version, document_hash: d.sha256_hash, acceptance_method: 'registration' }); }
      await logAcceptance(data.user.id, acceptances);

      setRegisteredEmail(normalizedEmail);
      if (data.session) {
        window.location.replace(`${window.location.origin}/#/market-value`);
        return;
      }

      setMessageType('success');
      setMessage(c.success);
    } catch (err) {
      console.error('B2C registration error:', err);
      setMessageType('error');
      const errorMessage = err instanceof Error ? err.message : '';
      setMessage(errorMessage || c.error);
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: registeredEmail });
      if (error) throw error;
      setMessageType('success');
      setMessage(c.resent);
    } catch (err) {
      console.error('B2C confirmation resend error:', err);
      setMessageType('error');
      setMessage(err instanceof Error ? err.message : c.error);
    } finally {
      setResending(false);
    }
  };

  return <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,52,0.08)] p-8 border border-gray-100">
      <div className="text-center mb-7">
        <img src="/logo.png" alt="InCORE" className="h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#000052]">{c.title}</h1>
        <p className="text-gray-500 text-sm mt-2 leading-6">{c.subtitle}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-[#000052]">{c.name}
          <div className="relative mt-1"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required value={name} onChange={e => setName(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <label className="block text-sm font-medium text-[#000052]">{c.telegram}
          <span className="ml-2 text-xs font-normal text-gray-400">{c.telegramHint}</span>
          <div className="relative mt-1"><input type="text" required value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" pattern="@[A-Za-z0-9_]{5,32}" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <label className="block text-sm font-medium text-[#000052]">{c.email}
          <div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <label className="block text-sm font-medium text-[#000052]">{c.password}
          <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3"><div className="flex items-center gap-2 text-[#000052] font-medium text-sm"><Shield size={16} className="text-[#B8860B]"/>{c.consentTitle}</div><label className="flex items-start gap-3 text-sm text-gray-600"><input type="checkbox" checked={consentTos} onChange={e=>setConsentTos(e.target.checked)} className="mt-1 w-4 h-4"/><span>{c.consentTos} <a href="/docs/\${lang}/tos_v1.0.pdf" target="_blank" rel="noopener noreferrer" className="text-[#B8860B]"><FileText size={12} className="inline"/> {c.viewDocument}</a> <span className="text-red-500">*</span></span></label><label className="flex items-start gap-3 text-sm text-gray-600"><input type="checkbox" checked={consentPrivacy} onChange={e=>setConsentPrivacy(e.target.checked)} className="mt-1 w-4 h-4"/><span>{c.consentPrivacy} <a href="/docs/\${lang}/privacy_v1.0.pdf" target="_blank" rel="noopener noreferrer" className="text-[#B8860B]"><FileText size={12} className="inline"/> {c.viewDocument}</a> <span className="text-red-500">*</span></span></label><label className="flex items-start gap-3 text-sm text-gray-600"><input type="checkbox" checked={consentPd} onChange={e=>setConsentPd(e.target.checked)} className="mt-1 w-4 h-4"/><span>{c.consentPd} <a href="/docs/\${lang}/consent_pd_v1.0.pdf" target="_blank" rel="noopener noreferrer" className="text-[#B8860B]"><FileText size={12} className="inline"/> {c.viewDocument}</a> <span className="text-red-500">*</span></span></label><label className="flex items-start gap-3 text-sm text-gray-600"><input type="checkbox" checked={consentBio} onChange={e=>setConsentBio(e.target.checked)} className="mt-1 w-4 h-4"/><span>{c.consentBio} <a href="/docs/\${lang}/consent_bio_v1.0.pdf" target="_blank" rel="noopener noreferrer" className="text-[#B8860B]"><FileText size={12} className="inline"/> {c.viewDocument}</a></span></label><p className="text-xs text-gray-500"><Fingerprint size={12} className="inline"/> {c.consentBioNote}</p></div>
        {message && <div className={`rounded-xl border px-4 py-3 text-sm ${messageType === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>{message}</div>}
        <button type="submit" disabled={busy || resending || !consentTos || !consentPrivacy || !consentPd} className="w-full bg-[#000052] text-white py-3.5 rounded-xl font-semibold disabled:opacity-50">{busy ? '...' : c.button}</button>
      </form>
      {registeredEmail && messageType === 'success' && <div className="mt-3 space-y-2">
        <button type="button" onClick={resendConfirmation} disabled={resending} className="w-full border border-[#000052]/20 text-[#000052] py-3 rounded-xl font-semibold disabled:opacity-50">{resending ? '...' : c.resend}</button>
        <button type="button" onClick={() => go('/login')} className="w-full text-sm text-[#B8860B] font-semibold">{c.login}</button>
      </div>}
      {!registeredEmail && <button type="button" onClick={() => go('/login')} className="w-full mt-5 text-sm text-[#B8860B] font-semibold">{c.login}</button>}
    </div>
  </div>;
}
