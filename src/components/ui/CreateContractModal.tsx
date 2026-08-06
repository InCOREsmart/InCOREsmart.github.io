import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, DollarSign, Calendar, FileText, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAcceptance, getActiveDocuments, getDocumentByType } from '../../lib/legal';
import { useAuth } from '../../contexts/AuthContext';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated: () => void;
}

export function CreateContractModal({ isOpen, onClose, onContractCreated }: CreateContractModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [revenue, setRevenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Согласие на условия смарт-контракта
  const [consentSmartContract, setConsentSmartContract] = useState(false);
  const [smartContractDocUrl, setSmartContractDocUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSmartContractDocument();
    }
  }, [isOpen]);

  const loadSmartContractDocument = async () => {
    const doc = await getDocumentByType('smart_contract');
    if (doc) {
      const { data } = supabase.storage.from('legal-docs').getPublicUrl(doc.file_url);
      setSmartContractDocUrl(data.publicUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!consentSmartContract) {
      setError(t('contract.consentRequired'));
      return;
    }

    if (!user) {
      setError(t('common.authRequired'));
      return;
    }

    setLoading(true);

    try {
      // 1. Получение company_id пользователя
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError || !company) {
        throw new Error('Company not found');
      }

      // 2. Создание контракта
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: company.id,
          title,
          description,
          deadline,
          escrow_amount: parseFloat(escrowAmount),
          kpi_revenue: parseFloat(revenue),
          status: 'DRAFT',
          reward_type: 'standard_b2b'
        })
        .select()
        .single();

      if (contractError) {
        throw contractError;
      }

      if (!contract) {
        throw new Error('Contract not created');
      }

      // 3. Логирование согласия CEO на условия смарт-контракта
      const smartContractDoc = await getDocumentByType('smart_contract');
      
      if (smartContractDoc) {
        await logAcceptance(user.id, [
          {
            document_type: 'smart_contract',
            document_id: smartContractDoc.id,
            document_version: smartContractDoc.version,
            document_hash: smartContractDoc.sha256_hash,
            acceptance_method: 'smart_contract_activation',
            contract_id: contract.id
          }
        ]);
      }

      // 4. Успех
      onContractCreated();
      resetForm();
      onClose();

    } catch (err: any) {
      console.error('Error creating contract:', err);
      setError(err.message || t('contract.createError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setEscrowAmount('');
    setRevenue('');
    setConsentSmartContract(false);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#000052]">
            {t('contract.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Название контракта */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('contract.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
              placeholder={t('contract.titlePlaceholder')}
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('contract.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none resize-none"
              placeholder={t('contract.descriptionPlaceholder')}
            />
          </div>

          {/* Дедлайн */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              <Calendar size={16} className="inline mr-2" />
              {t('contract.deadline')}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
            />
          </div>

          {/* Сумма эскроу */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              <DollarSign size={16} className="inline mr-2" />
              {t('contract.escrowAmount')}
            </label>
            <input
              type="number"
              value={escrowAmount}
              onChange={(e) => setEscrowAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
              placeholder="1500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('contract.escrowNote')}
            </p>
          </div>

          {/* Плановая выручка */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('contract.plannedRevenue')}
            </label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
              placeholder="10000"
            />
          </div>

          {/* Согласие на условия смарт-контракта */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consentSmartContract"
                checked={consentSmartContract}
                onChange={(e) => setConsentSmartContract(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#B8860B] focus:ring-[#B8860B]"
              />
              <label htmlFor="consentSmartContract" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 text-[#000052] font-medium text-sm mb-1">
                  <Shield size={16} className="text-[#B8860B]" />
                  {t('contract.consentSmartContract')}
                </div>
                <p className="text-sm text-gray-600">
                  {t('contract.consentSmartContractText')}{' '}
                  {smartContractDocUrl && (
                    <a
                      href={smartContractDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#B8860B] hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText size={12} />
                      {t('auth.viewDocument')}
                    </a>
                  )}
                  <span className="text-red-500"> *</span>
                </p>
              </label>
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !consentSmartContract}
              className="flex-1 px-6 py-3 bg-[#B8860B] hover:bg-[#9A7209] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('contract.createButton')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}