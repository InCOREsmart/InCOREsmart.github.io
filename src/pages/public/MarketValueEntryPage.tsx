import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MarketValueCalculatorJourney } from './MarketValueCalculatorJourney';
import { Mail, User, Lock } from 'lucide-react';

type Lang = 'ru' | 'en' | 'kk' | 'az';

const copy = {
  ru: { title: 'Регистрация в калькуляторе', subtitle: 'Сначала создадим твой профиль. После регистрации откроется расчёт рыночной стоимости.', name: 'Имя', email: 'Email', password: 'Пароль', button: 'Зарегистрироваться', login: 'Уже есть профиль? Войти', note: 'Это отдельный профиль для калькулятора. Регистрация в модуле смарт-контрактов здесь не требуется.', error: 'Не удалось зарегистрировать профиль. Проверь данные и попробуй ещё раз.', short: 'Пароль должен содержать минимум 6 символов.', success: 'Проверь почту и подтверди email. После подтверждения войди в калькулятор.', required: 'Заполни все поля.' },
  en: { title: 'Calculator registration', subtitle: 'First, let’s create your profile. After registration, the market value calculator will open.', name: 'Name', email: 'Email', password: 'Password', button: 'Create profile', login: 'Already have a profile? Sign in', note: 'This is a separate calculator profile. Smart-contract module registration is not required here.', error: 'Could not create the profile. Check your details and try again.', short: 'Password must contain at least 6 characters.', success: 'Check your email and confirm the address. Then sign in to enter the calculator.', required: 'Please fill in all fields.' },
  kk: { title: 'Калькуляторға тіркелу', subtitle: 'Алдымен профиліңді жасаймыз. Тіркелгеннен кейін нарықтық құн калькуляторы ашылады.', name: 'Аты', email: 'Email', password: 'Құпиясөз', button: 'Профиль жасау', login: 'Профиль бар ма? Кіру', note: 'Бұл калькуляторға арналған бөлек профиль. Смарт-келісімшарттар модуліне тіркелу мұнда қажет емес.', error: 'Профильді жасау мүмкін болмады. Деректерді тексеріп, қайта көр.', short: 'Құпиясөз кемінде 6 таңбадан тұруы керек.', success: 'Поштаңды тексеріп, email-ді раста. Содан кейін калькуляторға кір.', required: 'Барлық жолды толтыр.' },
  az: { title: 'Kalkulyatorda qeydiyyat', subtitle: 'Əvvəlcə profilini yaradaq. Qeydiyyatdan sonra bazar dəyəri kalkulyatoru açılacaq.', name: 'Ad', email: 'Email', password: 'Şifrə', button: 'Profil yarat', login: 'Artıq profilin var? Daxil ol', note: 'Bu kalkulyator üçün ayrıca profildir. Smart-müqavilə modulunda qeydiyyat burada tələb olunmur.', error: 'Profil yaratmaq mümkün olmadı. Məlumatları yoxla və yenidən cəhd et.', short: 'Şifrə ən azı 6 simvol olmalıdır.', success: 'Email-i yoxla və ünvanı təsdiqlə. Sonra kalkulyatora daxil ol.', required: 'Bütün sahələri doldur.' },
} as const;

export function MarketValueEntryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>('ru');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('incore-lang') as Lang | null;
    if (stored && stored in copy) setLang(stored);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#000052]">Загрузка...</div>;
  if (user) return <MarketValueCalculatorJourney />;

  const c = copy[lang];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!name.trim() || !email.trim() || !password) return setMessage(c.required);
    if (password.length < 6) return setMessage(c.short);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role: 'guest', full_name: name.trim(), profile_type: 'b2c_calculator' } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('User not created');
      if (data.session) {
        navigate('/market-value', { replace: true });
        return;
      }
      setMessage(c.success);
    } catch (err) {
      console.error('B2C registration error:', err);
      setMessage(err instanceof Error ? err.message : c.error);
    } finally {
      setBusy(false);
    }
  };

  return <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,52,0.08)] p-8 border border-gray-100">
      <div className="text-center mb-7">
        <img src="/logo.png" alt="InCORE" className="h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#000052]">{c.title}</h1>
        <p className="text-gray-500 text-sm mt-2 leading-6">{c.subtitle}</p>
      </div>

      <div className="rounded-xl bg-[#000052]/5 border border-[#000052]/10 p-4 mb-6 text-sm text-[#000052]">{c.note}</div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-[#000052]">{c.name}
          <div className="relative mt-1"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required value={name} onChange={e => setName(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <label className="block text-sm font-medium text-[#000052]">{c.email}
          <div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        <label className="block text-sm font-medium text-[#000052]">{c.password}
          <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#000052]" /></div>
        </label>
        {message && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{message}</div>}
        <button type="submit" disabled={busy} className="w-full bg-[#000052] text-white py-3.5 rounded-xl font-semibold disabled:opacity-50">{busy ? '...' : c.button}</button>
      </form>

      <button type="button" onClick={() => navigate('/login')} className="w-full mt-5 text-sm text-[#B8860B] font-semibold">{c.login}</button>
    </div>
  </div>;
}
