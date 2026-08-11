import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Download, FileText, DollarSign } from 'lucide-react';

export function CEOAccountingExport() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'az'
        ? 'az-AZ'
        : i18n.language === 'kk' || i18n.language === 'kz'
          ? 'kk-KZ'
          : 'en-US';

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.full_name ||
    t('ui.notAssigned');

  const getAgentInn = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.inn || '—';

  const generateCSV = (
    headers: string[],
    rows: string[][],
    filename: string
  ) => {
    const BOM = '\uFEFF';

    const csvContent =
      BOM +
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const downloadPaymentRegistry = () => {
    const headers = [
      t('accounting.date'),
      t('accounting.contract'),
      t('accounting.agent'),
      t('accounting.taxId'),
      t('ui.gmv'),
      t('ui.escrow'),
      t('accounting.commission'),
      t('accounting.payout'),
      t('accounting.companyProfit'),
      t('ui.status'),
    ];

    const rows = contracts.map((contract) => [
      new Date(contract.created_at).toLocaleDateString(locale),
      contract.title,
      getAgentName(contract.agent_id),
      getAgentInn(contract.agent_id),
      (contract.revenue || 0).toString(),
      (contract.escrow_amount || 0).toString(),
      ((contract.revenue || 0) * 0.12).toString(),
      (contract.agent_payouts_total || 0).toString(),
      (contract.company_profit || 0).toString(),
      contract.status,
    ]);

    generateCSV(
      headers,
      rows,
      `payment-registry-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const downloadActs = () => {
    const completed = contracts.filter(
      (contract) => contract.status === 'COMPLETED'
    );

    if (!completed.length) {
      alert(t('accounting.noCompletedContracts'));
      return;
    }

    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${t('accounting.actsOfWork')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f0f0f0;
            }
            h1 {
              color: #000052;
            }
            h2 {
              color: #B8860B;
            }
            .page {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
    `;

    html += `
      <h1>${company?.company_name || t('accounting.companyInfo')}</h1>
      <p>${t('accounting.taxId')}: ${company?.inn || '—'}</p>
      <hr/>
    `;

    completed.forEach((contract, index) => {
      const gmv = contract.revenue || 0;

      html += `
        <div class="page">
          <h2>${t('accounting.actsOfWork')} №${index + 1}</h2>
          <p>
            <b>${t('accounting.contractor')}:</b>
            ${getAgentName(contract.agent_id)}
          </p>

          <table>
            <tr>
              <th>${t('accounting.service')}</th>
              <th>${t('ui.amount')}</th>
            </tr>
            <tr>
              <td>${t('accounting.newSalesService')}</td>
              <td>$${(gmv * 0.5).toLocaleString()}</td>
            </tr>
            <tr>
              <td>${t('accounting.renewalService')}</td>
              <td>$${(gmv * 0.15).toLocaleString()}</td>
            </tr>
            <tr>
              <td>${t('accounting.crossSellService')}</td>
              <td>$${(gmv * 0.1).toLocaleString()}</td>
            </tr>
            <tr>
              <td>${t('accounting.planBonusService')}</td>
              <td>$${(gmv * 0.1).toLocaleString()}</td>
            </tr>
            <tr>
              <td>${t('accounting.retentionService')}</td>
              <td>$${(gmv * 0.1).toLocaleString()}</td>
            </tr>
            <tr>
              <td>${t('accounting.annualBonusService')}</td>
              <td>$${(gmv * 0.05).toLocaleString()}</td>
            </tr>
            <tr>
              <td><b>${t('accounting.total')}</b></td>
              <td>
                <b>$${(contract.escrow_amount || 0).toLocaleString()}</b>
              </td>
            </tr>
          </table>
        </div>
      `;
    });

    html += `
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `work-acts-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const downloadIncomeStatements = () => {
    const headers = [
      t('accounting.agent'),
      t('accounting.taxId'),
      t('ui.status'),
      t('ui.contract'),
      t('ui.gmv'),
      t('accounting.payout'),
      t('accounting.commission'),
      t('accounting.companyProfit'),
    ];

    const stats = agents.map((agent) => {
      const agentContracts = contracts.filter(
        (contract) => contract.agent_id === agent.id
      );

      const totalGmv = agentContracts.reduce(
        (sum, contract) => sum + (contract.revenue || 0),
        0
      );

      const totalPayouts = agentContracts.reduce(
        (sum, contract) => sum + (contract.agent_payouts_total || 0),
        0
      );

      return [
        agent.full_name,
        agent.inn || '—',
        agent.tax_status || '—',
        agentContracts.length.toString(),
        totalGmv.toString(),
        totalPayouts.toString(),
        (totalGmv * 0.12).toString(),
        (totalPayouts - totalGmv * 0.12).toString(),
      ];
    });

    generateCSV(
      headers,
      stats,
      `income-statements-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const downloadAll = () => {
    downloadPaymentRegistry();
    setTimeout(downloadActs, 500);
    setTimeout(downloadIncomeStatements, 1000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" />
        <p className="mt-4 text-[#000052]">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">
          {t('accounting.title')}
        </h1>

        <p className="text-sm text-[#000052]/70 mt-1">
          {t('accounting.subtitle')}
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-[#B8860B]" />

          <h2 className="text-lg font-bold text-[#000052]">
            {t('accounting.companyInfo')}
          </h2>
        </div>

        {company ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-[#000052]/60">
                {t('company.companyName')}
              </div>

              <div className="font-semibold text-[#000052]">
                {company.company_name || '—'}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#000052]/60">
                {t('company.inn')}
              </div>

              <div className="font-semibold text-[#000052]">
                {company.inn || '—'}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#000052]/60">
                {t('company.companyType')}
              </div>

              <div className="font-semibold text-[#000052]">
                {company.company_type || '—'}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#000052]/60">
                {t('company.fullName')}
              </div>

              <div className="font-semibold text-[#000052]">
                {company.full_name || '—'}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[#000052]/60">
            {t('company.companyDataDescription')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />

            <h3 className="font-bold text-[#000052]">
              {t('accounting.paymentRegistry')}
            </h3>
          </div>

          <p className="text-sm text-[#000052]/70 mb-4">
            {t('accounting.paymentRegistryDesc')}
          </p>

          <button
            onClick={downloadPaymentRegistry}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {t('accounting.downloadCsv')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />

            <h3 className="font-bold text-[#000052]">
              {t('accounting.actsOfWork')}
            </h3>
          </div>

          <p className="text-sm text-[#000052]/70 mb-4">
            {t('accounting.actsOfWorkDesc')}
          </p>

          <button
            onClick={downloadActs}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {t('accounting.downloadXls')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-[#B8860B]" />

            <h3 className="font-bold text-[#000052]">
              {t('accounting.incomeStatements')}
            </h3>
          </div>

          <p className="text-sm text-[#000052]/70 mb-4">
            {t('accounting.incomeStatementsDesc')}
          </p>

          <button
            onClick={downloadIncomeStatements}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {t('accounting.downloadCsv')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />

            <h3 className="font-bold text-[#000052]">
              {t('accounting.fullPackage')}
            </h3>
          </div>

          <p className="text-sm text-[#000052]/70 mb-4">
            {t('accounting.fullPackageDesc')}
          </p>

          <button
            onClick={downloadAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {t('accounting.downloadPackage')}
          </button>
        </div>
      </div>
    </div>
  );
}