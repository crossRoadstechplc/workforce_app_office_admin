"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

type StatusResponse = {
  enabled?: boolean;
  staffCount?: number;
  memberCount?: number;
  name?: string;
  data?: {
    enabled?: boolean;
    staffCount?: number;
    memberCount?: number;
    workspaceId?: string;
    name?: string;
  };
};

export default function TaskOperationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("Task Operations");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch<StatusResponse>("/admin/task-tracker/status");
      const payload = raw.data ?? raw;
      setEnabled(Boolean(payload.enabled));
      setMemberCount(
        Number(payload.memberCount ?? payload.staffCount ?? 0)
      );
      if (typeof payload.name === "string" && payload.name) setWorkspaceName(payload.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onEnable() {
    setEnabling(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/admin/task-tracker/enable", { method: "POST", body: "{}" });
      setMessage("Task Operations enabled and staff bootstrapped from your workforce.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enable failed.");
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Operations setup"
        description="Enable the shared board for this organization. After that, use the overview to review counts and continue in a new tab."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Status:{" "}
                <span className="font-semibold text-slate-950">
                  {enabled ? "Enabled" : "Not enabled"}
                </span>
              </p>
              {enabled ? (
                <p className="text-sm text-slate-500">
                  {workspaceName} · {memberCount} people on the board
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Enabling creates one workspace for this company, seeds the permission matrix, and
                  adds active employees plus admins with default tracker roles.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!enabled ? (
                  <Button onClick={onEnable} disabled={enabling}>
                    {enabling ? "Enabling…" : "Enable Task Operations"}
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/task-operations">Back to overview</Link>
                  </Button>
                )}
              </div>
            </>
          )}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
