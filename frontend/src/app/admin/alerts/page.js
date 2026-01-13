"use client";

import AdminLayout from "@/components/Dashboard/AdminLayout";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminAlertsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900  mb-2">
              Global Alerts
            </h1>
            <p className="text-gray-600 ">
              This page has been deprecated. Security alerts are now shown in
              the Security Overview.
            </p>
          </div>
        </div>

        <div className="bg-white  rounded-none shadow-sm p-12 text-center border-[1.5px] border-gray-200 ">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900  mb-2">
            Page Moved
          </h2>
          <p className="text-gray-600  mb-6">
            Security alerts have been consolidated into the Security Overview
            page for a better experience.
          </p>
          <Link
            href="/admin/security"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 border border-transparent text-white font-medium rounded-none transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Security Overview
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
