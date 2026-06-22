import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJWT } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNavbar from "@/components/shared/AdminNavbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await cookies() under Next.js 15+ specifications
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    redirect("/admin/login");
  }

  const admin = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      username: true,
      name: true,
    },
  });

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA] text-[#111111] antialiased">
      <AdminNavbar
        adminName={admin.name || "管理員"}
        adminUsername={admin.username}
      />
      {/* Main Content Area: offset on desktop by the sidebar width (64 / 16rem) */}
      <div className="flex-grow flex flex-col md:pl-64 w-full min-w-0">
        <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
