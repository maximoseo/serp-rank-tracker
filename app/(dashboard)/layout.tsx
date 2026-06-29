import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
