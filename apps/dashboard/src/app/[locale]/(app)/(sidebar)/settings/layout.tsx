import { SecondaryMenu } from "@/components/secondary-menu";
import { isCompanyDeployment } from "@/utils/deployment-mode";

export default function Layout({ children }: { children: React.ReactNode }) {
  const items = [
    { path: "/settings", label: "General" },
    ...(!isCompanyDeployment()
      ? [{ path: "/settings/billing", label: "Billing" }]
      : []),
    { path: "/settings/accounts", label: "Bank Connections" },
    { path: "/settings/members", label: "Members" },
    { path: "/settings/notifications", label: "Notifications" },
    { path: "/settings/developer", label: "Developer" },
  ];

  return (
    <div className="max-w-[800px]">
      <SecondaryMenu items={items} />

      <main className="mt-8">{children}</main>
    </div>
  );
}
