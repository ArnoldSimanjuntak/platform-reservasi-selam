import type { ReactNode } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminContext } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const { adminName } = await getAdminContext();

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50">
            <AdminHeader adminName={adminName} />
            {children}
        </div>
    );
}
