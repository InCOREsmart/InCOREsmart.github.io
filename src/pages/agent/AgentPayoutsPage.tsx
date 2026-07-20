import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useTranslation } from "react-i18next";

export function AgentPayoutsPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">
        {t("payouts.title")}
      </h1>

      <div className="card">
        {t("payouts.empty")}
      </div>
    </DashboardLayout>
  );
}