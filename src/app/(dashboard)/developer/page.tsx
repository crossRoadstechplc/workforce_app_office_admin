"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound } from "lucide-react";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/developer/http-badges";
import { apiDocs } from "@/features/developer/registry";

export default function DeveloperPage() {
  return (
    <CompanyAdminGate>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader
          title="Developer"
          description="Guides for developers connecting other apps to Workforce. Share a guide with the developer together with an API key."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apiDocs.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.slug}
                href={`/developer/${doc.slug}`}
                className="group flex flex-col rounded-2xl border bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{doc.version}</span>
                </div>
                <h2 className="mt-4 font-semibold text-slate-950">{doc.title}</h2>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">{doc.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[...new Set(doc.endpoints.map((e) => e.method))].map((method) => (
                    <MethodBadge key={method} method={method} size="sm" />
                  ))}
                  <span className="ml-1 self-center text-xs text-slate-500">{doc.endpoints.length} endpoints</span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                  Read the guide
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}

          <div className="flex flex-col rounded-2xl border border-dashed bg-white/60 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <BookOpen className="size-5" />
            </div>
            <h2 className="mt-4 font-semibold text-slate-700">More APIs coming</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">New guides appear here as more integrations are added.</p>
          </div>
        </div>

        <Link
          href="/meetings/integrations"
          className="group flex items-center gap-4 rounded-2xl border bg-white p-5 transition hover:border-blue-200"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <KeyRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-950">Need an API key?</p>
            <p className="text-sm text-slate-600">Create, pause or revoke keys and check webhook deliveries in API access.</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </Link>
      </div>
    </CompanyAdminGate>
  );
}
