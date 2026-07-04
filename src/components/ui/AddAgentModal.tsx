import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, User, Phone, Mail, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddAgentModalProps {
  onClose: () => void;
  onAdded: () => void;
}

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  specialization: string;
  experience: string;
  comment: string;
}

const initialFormData: FormData = {
  full_name: '',
  phone: '',
  email: '',
  specialization: '',
  experience: '',
  comment: '',
};

export function AddAgentModal({ onClose, onAdded }: AddAgentModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 1) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 1)}(${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits.slice(0, 1)}(${digits.slice(1, 4)})${digits.slice(4)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 1)}(${digits.slice(1, 4)})${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+${digits.slice(0, 1)}(${digits.slice(1, 4)})${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleChange('phone', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // For now, we'll just store the agent info
      // In a real implementation, you would send an invitation email
      // or create a pending agent record

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onAdded();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-primary border border-text-secondary/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-text-secondary/10">
          <h2 className="text-xl font-display font-semibold text-text-primary">
            Добавить агента
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-error/20 border border-error/30 rounded-lg text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="label flex items-center gap-2">
              <User className="w-4 h-4 text-text-muted" />
              ФИО *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="input"
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label flex items-center gap-2">
              <Phone className="w-4 h-4 text-text-muted" />
              Телефон *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="input"
              placeholder="+7(999)999-99-99"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="label flex items-center gap-2">
              <Mail className="w-4 h-4 text-text-muted" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input"
              placeholder="agent@company.com"
              required
            />
          </div>

          {/* Specialization */}
          <div>
            <label className="label flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-text-muted" />
              Специализация
            </label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => handleChange('specialization', e.target.value)}
              className="input"
              placeholder="B2B продажи, страхование"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="label flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-muted" />
              Опыт работы
            </label>
            <input
              type="text"
              value={formData.experience}
              onChange={(e) => handleChange('experience', e.target.value)}
              className="input"
              placeholder="5 лет в продажах"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="label flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-text-muted" />
              Комментарий
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              className="input min-h-[80px]"
              placeholder="Дополнительная информация"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-text-secondary/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? t('common.loading') : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
