import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, FileText, AlertTriangle, CheckCircle, XCircle, Calendar, Globe, Clock, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserAcceptanceHistory, revokeConsent, AcceptanceLog } from '../lib/legal';
import { useAuth } from '../contexts/AuthContext';

interface ConsentWithDoc extends AcceptanceLog {
  document_name?: string;
  document_url?: string;
}

export function MyConsentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [consents, setConsents] = useState<ConsentWithDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Модалка отзыва согласия
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentWithDoc | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (user) {
      loadConsents();
    }
  }, [user]);

  const loadConsents = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const history = await getUserAcceptanceHistory(user.id);

      // Получаем названия документов из legal_documents
      const enriched: ConsentWithDoc[] = await Promise.all(
        history.map(async (log) => {
          let document_name = t(`consents.documentTypes.${log.document_type}`, log.document_type);
          let document_url = '';

          if (log.document_id) {
            const { data: doc } = await supabase
              .from('legal_documents')
              .select('file_url')
              .eq('id', log.document_id)
              .single();

            if (doc?.file_url) {
              const { data } = supabase.storage.from('legal-docs').getPublicUrl(doc.file_url);
              document_url = data.publicUrl;
            }
          }

          return {
            ...log,
            document_name,
            document_url
          };
        })
      );

      setConsents(enriched);
    } catch (err: any) {
      console.error('Error loading consents:', err);
      setError(err.message || t('consents.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const openRevokeModal = (consent: ConsentWithDoc) => {
    setSelectedConsent(consent);
    setRevokeReason('');
    setShowRevokeModal(true);
  };

  const handleRevoke = async () => {
    if (!user || !selectedConsent || !revokeReason.trim()) return;

    setRevoking(true);
    setError('');
    setSuccess('');

    try {
      const successRevoked = await revokeConsent(
        user.id,
        selectedConsent.document_id!,
        revokeReason
      );

      if (successRevoked) {
        setSuccess(t('consents.revokeSuccess'));
        setShowRevokeModal(false);
        await loadConsents();
      } else {
        throw new Error(t('consents.revokeError'));
      }
    } catch (err: any) {
      setError(err.message || t('consents.revokeError'));
    } finally {
      setRevoking(false);
    }
  };

  const canRevoke = (consent: ConsentWithDoc): boolean => {
    // Нельзя отозвать согласие на смарт-контракт (привязано к контракту)
    if (consent.contract_id) return false;
    // Нельзя отозвать уже отозванное
    if (!consent.is_valid) return false;
    // Все остальные можно отозвать
    return true;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'az' ? 'az-AZ' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { i18n } = useTranslation();

  // Статистика
  const totalConsents = consents.length;
  const activeConsents = consents.filter(c => c.is_valid).length;
  const revokedConsents = consents.filter(c => !c.is_valid).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={32} className="text-[#B8860B]" />
          <h1 className="text-3xl font-bold text-[#000052]">
            {t('consents.title')}
          </h1>
        </div>
        <p className="text-gray-600">
          {t('consents.subtitle')}
        </p>
      </div>

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">{t('consents.infoTitle')}</p>
          <p>{t('consents.infoText')}</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={20} className="text-[#000052]" />
            <span className="text-sm text-gray-600">{t('consents.totalConsents')}</span>
          </div>
          <div className="text-3xl font-bold text-[#000052]">{totalConsents}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-sm text-gray-600">{t('consents.activeConsents')}</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{activeConsents}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <XCircle size={20} className="text-red-600" />
            <span className="text-sm text-gray-600">{t('consents.revokedConsents')}</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{revokedConsents}</div>
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Таблица согласий */}
      {consents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('consents.noConsents')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.documentType')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.version')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.acceptedAt')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.ipAddress')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.status')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {t('consents.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consents.map((consent) => (
                  <tr key={consent.id} className="hover:bg-gray-50 transition-colors">
                    {/* Тип документа */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#B8860B] shrink-0" />
                        <div>
                          <div className="font-medium text-[#000052]">
                            {consent.document_name}
                          </div>
                          {consent.document_url && (
                            <a
                              href={consent.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#B8860B] hover:underline"
                            >
                              {t('consents.viewDocument')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Версия */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      v{consent.document_version || '1.0'}
                    </td>

                    {/* Дата принятия */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} className="shrink-0" />
                        {formatDate(consent.accepted_at)}
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Globe size={14} className="shrink-0" />
                        {consent.ip_address || '—'}
                      </div>
                    </td>

                    {/* Статус */}
                    <td className="px-6 py-4">
                      {consent.is_valid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} />
                          {t('consents.statusActive')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={12} />
                          {t('consents.statusRevoked')}
                          {consent.revoked_at && (
                            <span className="ml-1 text-xs">
                              ({formatDate(consent.revoked_at)})
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Действия */}
                    <td className="px-6 py-4">
                      {canRevoke(consent) ? (
                        <button
                          onClick={() => openRevokeModal(consent)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <XCircle size={14} />
                          {t('consents.revokeButton')}
                        </button>
                      ) : consent.contract_id ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Info size={12} />
                          {t('consents.linkedToContract')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка отзыва согласия */}
      {showRevokeModal && selectedConsent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            {/* Заголовок */}
            <div className="flex items-start gap-3 p-6 border-b border-gray-200">
              <AlertTriangle size={24} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-[#000052]">
                  {t('consents.revokeTitle')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('consents.revokeDescription', {
                    document: selectedConsent.document_name
                  })}
                </p>
              </div>
            </div>

            {/* Содержимое */}
            <div className="p-6 space-y-4">
              {/* Предупреждение */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  {t('consents.revokeWarning')}
                </p>
              </div>

              {/* Причина */}
              <div>
                <label className="block text-sm font-medium text-[#000052] mb-2">
                  {t('consents.revokeReasonLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none resize-none"
                  placeholder={t('consents.revokeReasonPlaceholder')}
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={revoking}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking || !revokeReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {revoking ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <XCircle size={16} />
                    {t('consents.revokeConfirmButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}