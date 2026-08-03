import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Download, FileText, FileSpreadsheet, Archive, Info } from 'lucide-react';

export function CEOAccountingExport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setCompany(companyData);

        if (companyData) {
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });
          setContracts(contractsData || []);

          const { data: agentsData } = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', companyData.id);
          setAgents(agentsData || []);
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.full_name || 'Не назначен';
  };

  const getAgentInn = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.inn || '—';
  };

  // Генерация CSV
  const generateCSV = (headers: string[], rows: string[][], filename: string) => {
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1. Реестр платежей
  const downloadPaymentRegistry = () => {
    const headers = ['Дата', 'Контракт', 'Агент', 'ИНН агента', 'Сумма GMV', 'Эскроу', 'Комиссия 12%', 'Выплата агенту', 'Прибыль компании', 'Статус'];
    const rows = contracts.map(c => [
      new Date(c.created_at).toLocaleDateString('ru-RU'),
      c.title,
      getAgentName(c.agent_id),
      getAgentInn(c.agent_id),
      (c.revenue || 0).toString(),
      (c.escrow_amount || 0).toString(),
      ((c.revenue || 0) * 0.12).toString(),
      (c.agent_payouts_total || 0).toString(),
      (c.company_profit || 0).toString(),
      c.status,
    ]);
    generateCSV(headers, rows, `Реестр_платежей_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 2. Акт выполненных работ
  const downloadActs = () => {
    const completedContracts = contracts.filter(c => c.status === 'COMPLETED');
    if (completedContracts.length === 0) {
      alert('Нет завершенных контрактов для формирования актов');
      return;
    }

    let html = `<html><head><meta charset="utf-8"><title>Акты выполненных работ</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{border:1px solid #000;padding:8px;text-align:left}
    th{background:#f0f0f0}h1{color:#000052}h2{color:#B8860B}
    .page{page-break-after:always}</style></head><body>`;

    html += `<h1>${company?.company_name || 'Компания'}</h1>`;
    html += `<p>ИНН: ${company?.inn || '—'} | КПП: ${company?.kpp || '—'} | ОГРН: ${company?.ogrn || '—'}</p>`;
    html += `<hr/>`;

    completedContracts.forEach((c, i) => {
      const gmv = c.revenue || 0;
      html += `<div class="page">`;
      html += `<h2>Акт №${i + 1} от ${new Date(c.deadline).toLocaleDateString('ru-RU')}</h2>`;
      html += `<p><b>Заказчик:</b> ${company?.company_name || '—'}</p>`;
      html += `<p><b>Исполнитель:</b> ${getAgentName(c.agent_id)} (ИНН: ${getAgentInn(c.agent_id)})</p>`;
      html += `<p><b>Контракт:</b> ${c.title}</p>`;
      html += `<table><tr><th>Услуга</th><th>Сумма</th></tr>`;
      html += `<tr><td>Новые продажи (50%)</td><td>$${(gmv * 0.50).toLocaleString()}</td></tr>`;
      html += `<tr><td>Продление (15%)</td><td>$${(gmv * 0.15).toLocaleString()}</td></tr>`;
      html += `<tr><td>Кросс-продажи (10%)</td><td>$${(gmv * 0.10).toLocaleString()}</td></tr>`;
      html += `<tr><td>Бонус за план (10%)</td><td>$${(gmv * 0.10).toLocaleString()}</td></tr>`;
      html += `<tr><td>Удержание 90 дней (10%)</td><td>$${(gmv * 0.10).toLocaleString()}</td></tr>`;
      html += `<tr><td>Годовой бонус (5%)</td><td>$${(gmv * 0.05).toLocaleString()}</td></tr>`;
      html += `<tr><td><b>ИТОГО</b></td><td><b>$${(c.escrow_amount || 0).toLocaleString()}</b></td></tr>`;
      html += `</table></div>`;
    });

    html += `</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Акты_выполненных_работ_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. Справка о доходах агентов
  const downloadIncomeStatements = () => {
    const headers = ['Агент', 'ИНН', 'Налоговый статус', 'Кол-во контрактов', 'Общий GMV', 'Общие выплаты', 'Комиссия платформы', 'Чистый доход'];
    const agentStats = agents.map(agent => {
      const agentContracts = contracts.filter(c => c.agent_id === agent.id);
      const totalGmv = agentContracts.reduce((s, c) => s + (c.revenue || 0), 0);
      const totalPayouts = agentContracts.reduce((s, c) => s + (c.agent_payouts_total || 0), 0);
      
      return [
        agent.full_name,
        agent.inn || '—',
        agent.tax_status || '—',
        agentContracts.length.toString(),
        totalGmv.toString(),
        totalPayouts.toString(),
        (totalGmv * 0.12).toString(), // Встроено напрямую, чтобы избежать ошибки линтера
        (totalPayouts - (totalGmv * 0.12)).toString(),
      ];
    });
    generateCSV(headers, agentStats, `Справки_о_доходах_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 4. Скачать всё одним кликом
  const downloadAll = () => {
    downloadPaymentRegistry();
    setTimeout(() => downloadActs(), 500);
    setTimeout(() => downloadIncomeStatements(), 1000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-[#000052]">Бухгалтерский экспорт</h1>
        <p className="text-gray-600 mt-1">Скачайте пакет документов для бухгалтерии</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#000052]">Информация о компании</p>
          <p className="text-sm text-gray-700">
            {company?.company_name || '—'} | ИНН: {company?.inn || '—'} | КПП: {company?.kpp || '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-bold text-[#000052]">Реестр платежей</h3>
              <p className="text-xs text-gray-600">CSV со всеми транзакциями</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Дата, контракт, агент, ИНН, GMV, эскроу, комиссия, выплата, прибыль, статус.
          </p>
          <button
            onClick={downloadPaymentRegistry}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Скачать CSV
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-bold text-[#000052]">Акты выполненных работ</h3>
              <p className="text-xs text-gray-600">XLS для завершенных контрактов</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Акты с разбивкой по 6 потокам выплат для каждого завершенного контракта.
          </p>
          <button
            onClick={downloadActs}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Скачать XLS
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <h3 className="font-bold text-[#000052]">Справки о доходах</h3>
              <p className="text-xs text-gray-600">CSV по каждому агенту</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Сводка по агентам: ИНН, налоговый статус, кол-во контрактов, общие выплаты.
          </p>
          <button
            onClick={downloadIncomeStatements}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Скачать CSV
          </button>
        </div>

        <div className="bg-[#B8860B]/10 p-6 rounded-xl border border-[#B8860B]/30 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Archive className="w-8 h-8 text-[#B8860B]" />
            <div>
              <h3 className="font-bold text-[#000052]">Полный пакет</h3>
              <p className="text-xs text-gray-600">Все документы одним кликом</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Реестр + Акты + Справки. Скачиваются 3 файла последовательно.
          </p>
          <button
            onClick={downloadAll}
            className="w-full py-3 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Скачать пакет для бухгалтера
          </button>
        </div>
      </div>
    </div>
  );
}