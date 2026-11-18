"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Download, Info, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { curlSample, downloadPostman, fetchSample, json } from "@/features/developer/samples";
import type { ApiDoc, DocEndpoint, DocField } from "@/features/developer/types";
import { CodeBlock, CodeTabs, CopyButton } from "./code-block";
import { MethodBadge, StatusDot, StatusPill } from "./http-badges";

type TocItem = { id: string; label: string; endpoint?: DocEndpoint };

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function ApiDocView({ doc }: { doc: ApiDoc }) {
  const toc = useMemo<TocItem[]>(
    () => [
      { id: "overview", label: "Overview" },
      { id: "authentication", label: "Authentication" },
      { id: "responses", label: "Response format" },
      ...doc.endpoints.map((endpoint) => ({ id: endpoint.id, label: endpoint.title, endpoint })),
      { id: "errors", label: "Errors" },
      ...(doc.webhooks ? [{ id: "webhooks", label: "Webhooks" }] : [])
    ],
    [doc]
  );
  const ids = useMemo(() => toc.map((t) => t.id), [toc]);
  const active = useActiveSection(ids);
  const Icon = doc.icon;

  return (
    <div className="mx-auto max-w-[1400px]">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/developer" className="hover:text-slate-900">
          Developer
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-slate-900">{doc.title}</span>
      </nav>

      <header className="rounded-2xl border bg-white p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Icon className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{doc.title}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{doc.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{doc.version}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">REST · JSON</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  {doc.endpoints.length} endpoints
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">Updated {doc.updatedAt}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadPostman(doc)}>
              <Download className="size-4" />
              Postman collection
            </Button>
            {doc.related?.[0] && (
              <Button asChild>
                <Link href={doc.related[0].href}>
                  <KeyRound className="size-4" />
                  Get an API key
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile section jump bar */}
      <div className="sticky top-14 z-10 -mx-4 mt-4 overflow-x-auto border-b bg-[var(--background)]/95 px-4 py-2 backdrop-blur sm:top-16 md:-mx-6 md:px-6 lg:hidden">
        <div className="flex gap-2">
          {toc
            .filter((t) => !t.endpoint)
            .concat({ id: doc.endpoints[0]?.id ?? "overview", label: "Endpoints" })
            .map((item) => (
              <a
                key={item.label}
                href={`#${item.id}`}
                className="whitespace-nowrap rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {item.label}
              </a>
            ))}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
            <ul className="space-y-0.5 text-sm">
              {toc.map((item, index) => {
                const firstEndpoint = item.endpoint && !toc[index - 1]?.endpoint;
                return (
                  <li key={item.id}>
                    {firstEndpoint && (
                      <p className="mb-1 mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Endpoints</p>
                    )}
                    <a
                      href={`#${item.id}`}
                      aria-current={active === item.id ? "location" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition",
                        active === item.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        item.endpoint === undefined && index > 0 && toc[index - 1]?.endpoint ? "mt-3" : ""
                      )}
                    >
                      {item.endpoint && <MethodBadge method={item.endpoint.method} size="sm" />}
                      <span className="truncate">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-12">
          <OverviewSection doc={doc} />
          <AuthSection doc={doc} />
          <Section id="responses" title="Response format" lead="Every success is wrapped in data. Every error has the same shape — branch on error.code.">
            <div className="grid gap-4 xl:grid-cols-2">
              <CodeBlock title="Success" code={json(doc.envelope.success)} />
              <CodeBlock title="Error" code={json(doc.envelope.error)} />
            </div>
          </Section>

          <div className="space-y-6">
            <SectionHeading title="Endpoints" lead="All paths are relative to the base URL." />
            {doc.endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.id} doc={doc} endpoint={endpoint} />
            ))}
          </div>

          <ErrorsSection doc={doc} />
          {doc.webhooks && <WebhooksSection doc={doc} />}
          {doc.related?.length ? <RelatedSection doc={doc} /> : null}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, lead, id }: { title: string; lead?: string; id?: string }) {
  return (
    <div>
      <h2 className="group flex items-center gap-2 text-lg font-semibold text-slate-950">
        {title}
        {id && (
          <a href={`#${id}`} aria-label={`Link to ${title}`} className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-500">
            #
          </a>
        )}
      </h2>
      {lead && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{lead}</p>}
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeading id={id} title={title} lead={lead} />
      {children}
    </section>
  );
}

function OverviewSection({ doc }: { doc: ApiDoc }) {
  return (
    <Section id="overview" title="Overview">
      <dl className="divide-y overflow-hidden rounded-2xl border bg-white">
        {doc.basics.map((row) => (
          <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{row.label}</dt>
            <dd className="flex min-w-0 items-center gap-2 text-sm text-slate-900">
              <span className={cn("min-w-0 break-all", row.mono && "font-mono text-[13px]")}>{row.value}</span>
              {row.mono && <CopyButton value={row.value} className="shrink-0 text-slate-500 hover:bg-slate-100" />}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <p className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Endpoints at a glance</p>
        <ul className="divide-y">
          {doc.endpoints.map((endpoint) => (
            <li key={endpoint.id}>
              <a href={`#${endpoint.id}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <MethodBadge method={endpoint.method} size="sm" />
                <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-slate-800">{endpoint.path}</code>
                <span className="hidden text-sm text-slate-500 sm:inline">{endpoint.title}</span>
                <ArrowRight className="size-3.5 text-slate-300 group-hover:text-slate-500" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function AuthSection({ doc }: { doc: ApiDoc }) {
  return (
    <Section id="authentication" title="Authentication" lead={`Send your API key in the ${doc.auth.header} header on every request.`}>
      <CodeBlock title="Header" code={doc.auth.example} />
      <ul className="space-y-2">
        {doc.auth.notes.map((note) => (
          <li key={note} className="flex gap-2 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {note}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FieldList({ title, fields }: { title: string; fields?: DocField[] }) {
  if (!fields?.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="mt-2 divide-y rounded-xl border">
        {fields.map((field) => (
          <li key={field.name} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <code className="break-all font-mono text-[13px] font-semibold text-slate-900">{field.name}</code>
                {field.required && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">required</span>}
              </div>
              <div className="font-mono text-xs text-slate-500">{field.type}</div>
            </div>
            <p className="text-sm text-slate-600">{field.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EndpointCard({ doc, endpoint }: { doc: ApiDoc; endpoint: DocEndpoint }) {
  const requestTabs = [
    { label: "cURL", code: curlSample(doc, endpoint) },
    { label: "JavaScript", code: fetchSample(doc, endpoint) },
    ...(endpoint.requestExample !== undefined ? [{ label: "Body", code: json(endpoint.requestExample) }] : [])
  ];
  const responseTabs = endpoint.responses.map((response) => ({
    label: `${response.status} ${response.label}`,
    badge: <StatusDot status={response.status} />,
    code: response.example !== undefined ? json(response.example) : `// ${response.note ?? response.label}`
  }));
  const hasFields = endpoint.pathParams?.length || endpoint.query?.length || endpoint.body?.length;

  return (
    <section id={endpoint.id} className="scroll-mt-24 overflow-hidden rounded-2xl border bg-white">
      <div className="border-b p-5">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="min-w-0 break-all font-mono text-sm font-semibold text-slate-900">{endpoint.path}</code>
          <CopyButton value={`${doc.baseUrl}${endpoint.path}`} label="Copy full URL" className="text-slate-500 hover:bg-slate-100" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-950">{endpoint.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{endpoint.summary}</p>
      </div>

      <div className={cn("grid gap-6 p-5", hasFields || endpoint.notes?.length ? "2xl:grid-cols-2" : "")}>
        {(hasFields || endpoint.notes?.length) && (
          <div className="min-w-0 space-y-5">
            <FieldList title="Path parameters" fields={endpoint.pathParams} />
            <FieldList title="Query parameters" fields={endpoint.query} />
            <FieldList title="Body" fields={endpoint.body} />
            {endpoint.notes?.length ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <ul className="space-y-1.5">
                  {endpoint.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-sm text-slate-700">
                      <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        <div className="min-w-0 space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Request</h4>
            <CodeTabs tabs={requestTabs} />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Response</h4>
            <CodeTabs tabs={responseTabs} />
            {endpoint.responses
              .filter((r) => r.note && r.example === undefined)
              .map((r) => (
                <p key={r.status} className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <StatusPill status={r.status} />
                  {r.note}
                </p>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ErrorsSection({ doc }: { doc: ApiDoc }) {
  return (
    <Section id="errors" title="Errors" lead="Use error.code in your code and error.message for people. Include requestId when reporting a problem.">
      <div className="overflow-hidden rounded-2xl border bg-white">
        <ul className="divide-y">
          {doc.errors.flatMap((group) =>
            group.codes.map((row) => (
              <li key={`${group.status}-${row.code}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[3.5rem_minmax(0,18rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
                <StatusPill status={group.status} />
                <code className="break-all font-mono text-[13px] font-semibold text-slate-900">{row.code}</code>
                <p className="text-sm text-slate-600">{row.meaning}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </Section>
  );
}

function WebhooksSection({ doc }: { doc: ApiDoc }) {
  const hooks = doc.webhooks!;
  return (
    <Section id="webhooks" title="Webhooks" lead={hooks.intro}>
      <div className="grid gap-3 sm:grid-cols-2">
        {hooks.events.map((event) => (
          <div key={event.name} className="rounded-xl border bg-white p-3">
            <code className="font-mono text-[13px] font-semibold text-slate-900">{event.name}</code>
            <p className="mt-1 text-sm text-slate-600">{event.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <FieldList title="Headers" fields={hooks.headers} />
          <ul className="space-y-2">
            {hooks.rules.map((rule) => (
              <li key={rule} className="flex gap-2 text-sm text-slate-600">
                <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Body</h4>
          <CodeBlock title="POST to your webhook URL" code={json(hooks.payloadExample)} />
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-950">Verify the signature</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{hooks.verifyIntro}</p>
        <CodeTabs className="mt-3" tabs={hooks.verifySamples.map((s) => ({ label: s.label, code: s.code }))} />
      </div>
    </Section>
  );
}

function RelatedSection({ doc }: { doc: ApiDoc }) {
  return (
    <section className="space-y-4">
      <SectionHeading title="In this portal" />
      <div className="grid gap-3 sm:grid-cols-2">
        {doc.related!.map((link) => (
          <Link key={link.href} href={link.href} className="group rounded-xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
            <p className="flex items-center gap-1 font-semibold text-slate-900">
              {link.label}
              <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </p>
            <p className="mt-1 text-sm text-slate-600">{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
