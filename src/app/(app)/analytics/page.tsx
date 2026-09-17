import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  return <AnalyticsDashboard />;
}
