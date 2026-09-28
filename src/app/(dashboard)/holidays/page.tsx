"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { OfficeFilter } from "@/components/ops/office-filter";
import { MultiDateCalendar } from "@/components/ops/multi-date-calendar";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { employeeApi } from "@/features/employees/employee-api";
import { operationsApi } from "@/features/operations/operations-api";
import { employeeName, formatDate } from "@/lib/utils/format";
import type { CatalogHoliday, HolidayDetail } from "@/types/operations";

export default function HolidaysPage() {
  return (
    <TenantOpsGate>
      <HolidaysPageInner />
    </TenantOpsGate>
  );
}

function HolidaysPageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const qc = useQueryClient();

  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() - 7 : now.getFullYear() - 8;
  });
  const [filter, setFilter] = useState("public");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const catalogParams = useMemo(() => {
    const p = new URLSearchParams({ year: String(year) });
    if (filter && filter !== "all") p.set("filter", filter);
    if (filter === "all") p.set("filter", "all");
    return p;
  }, [year, filter]);

  const catalogQuery = useQuery({
    queryKey: ["holidays-catalog", catalogParams.toString()],
    queryFn: () => operationsApi.holidays(catalogParams)
  });

  const detailQuery = useQuery({
    queryKey: ["holiday-detail", selectedKey, year],
    queryFn: () => operationsApi.holiday(selectedKey!, year),
    enabled: !!selectedKey
  });

  const invalidateHolidays = () => {
    void qc.invalidateQueries({ queryKey: ["holidays-catalog"] });
    void qc.invalidateQueries({ queryKey: ["holiday-detail"] });
    void qc.invalidateQueries({ queryKey: ["attendance-day-roster"] });
    void qc.invalidateQueries({ queryKey: ["attendance-month-summary"] });
  };

  const autoMutation = useMutation({
    mutationFn: (input: { key: string; holidayId: string | null; autoApply: boolean }) =>
      operationsApi.setHolidayAutoApply({
        kenatKey: input.key.startsWith("custom:") ? undefined : input.key,
        holidayId: input.holidayId ?? (input.key.startsWith("custom:") ? input.key.slice("custom:".length) : undefined),
        year,
        autoApply: input.autoApply,
        notify: true
      }),
    onSuccess: (data, vars) => {
      toast.success(vars.autoApply ? "Automatic apply enabled" : "Automatic apply disabled");
      if (data.appliedNow) {
        toast.message(`Applied now to ${data.appliedNow.assignmentCount} employee(s)`);
      }
      invalidateHolidays();
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update automatic apply")
  });

  const items = (catalogQuery.data?.items ?? []).filter((h) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${h.nameEn} ${h.nameAm} ${h.key} ${h.tags.join(" ")}`.toLowerCase().includes(q);
  });

  if (catalogQuery.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description={
          isOfficeAdmin
            ? `Browse Ethiopian public holidays and custom rest days for ${officeLabel ?? "your offices"}. Use Auto to apply on the date, or Open to apply manually.`
            : "Browse Ethiopian public holidays and custom rest days. Toggle Auto to apply on the date with notification, or apply manually."
        }
        action={
          <Button onClick={() => setCustomOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Add custom day
          </Button>
        }
      />

      <FilterBar>
        <div className="space-y-1.5">
          <Label>Ethiopian year</Label>
          <Input
            type="number"
            className="w-28"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Filter</Label>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="public">Public</option>
            <option value="christian">Christian</option>
            <option value="muslim">Muslim</option>
            <option value="religious">Religious</option>
            <option value="cultural">Cultural</option>
            <option value="custom">Custom</option>
            <option value="all">All</option>
          </Select>
        </div>
        <div className="relative min-w-0 flex-1">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search holidays" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              {["Holiday", "Gregorian", "Ethiopian", "Tags", "Status", "Assigned", "Auto", ""].map((h) => (
                <Th key={h || "actions"}>{h}</Th>
              ))}
            </tr>
          </TableHead>
          <TableBody>
            {items.map((row) => {
              const isCustom = row.source === "CUSTOM" || row.key.startsWith("custom:");
              const toggling =
                autoMutation.isPending &&
                (autoMutation.variables?.key === row.key || autoMutation.variables?.holidayId === row.holidayId);
              return (
                <TableRow key={row.key}>
                  <Td>
                    <div className="font-medium">{row.nameEn}</div>
                    <div className="text-xs text-slate-500">{row.nameAm || (isCustom ? "Custom rest day" : "")}</div>
                  </Td>
                  <Td className="tabular-nums">{formatDate(row.gregorianDate)}</Td>
                  <Td className="tabular-nums">
                    {row.ethiopian?.year
                      ? `${row.ethiopian.day}/${row.ethiopian.month}/${row.ethiopian.year}`
                      : "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {(isCustom ? ["custom", ...row.tags.filter((t) => t !== "custom")] : row.tags)
                        .slice(0, 3)
                        .map((t) => (
                          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">
                            {t}
                          </span>
                        ))}
                    </div>
                  </Td>
                  <Td>
                    {row.applied ? (
                      <StatusBadge status="PUBLIC_HOLIDAY" />
                    ) : (
                      <span className="text-xs text-slate-500">Not applied</span>
                    )}
                  </Td>
                  <Td className="tabular-nums">{row.assignedEmployees}</Td>
                  <Td>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm" title="When on, apply automatically on this date">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300"
                        checked={!!row.autoApply}
                        disabled={toggling}
                        onChange={(e) =>
                          autoMutation.mutate({
                            key: row.key,
                            holidayId: row.holidayId,
                            autoApply: e.target.checked
                          })
                        }
                      />
                      <span className={row.autoApply ? "text-sky-700" : "text-slate-500"}>
                        {toggling ? "…" : row.autoApply ? "On" : "Off"}
                      </span>
                    </label>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedKey(row.key);
                        setApplyOpen(true);
                      }}
                    >
                      Open
                    </Button>
                  </Td>
                </TableRow>
              );
            })}
            {!items.length && <TableEmpty colSpan={8}>No holidays match this filter.</TableEmpty>}
          </TableBody>
        </Table>
      </TableShell>

      <ApplyHolidayDialog
        open={applyOpen && !!selectedKey}
        onOpenChange={(open) => {
          setApplyOpen(open);
          if (!open) setSelectedKey(null);
        }}
        holidayKey={selectedKey}
        year={year}
        detail={detailQuery.data}
        detailLoading={detailQuery.isLoading}
        showOfficeFilter={showOfficeFilter}
        onApplied={invalidateHolidays}
      />

      <CreateCustomHolidayDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        showOfficeFilter={showOfficeFilter}
        onCreated={invalidateHolidays}
      />
    </div>
  );
}

function ApplyHolidayDialog({
  open,
  onOpenChange,
  holidayKey,
  year,
  detail,
  detailLoading,
  showOfficeFilter,
  onApplied
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holidayKey: string | null;
  year: number;
  detail?: HolidayDetail;
  detailLoading: boolean;
  showOfficeFilter: boolean;
  onApplied: () => void;
}) {
  const [officeId, setOfficeId] = useState("");
  const [employeeMode, setEmployeeMode] = useState<"all" | "selected">("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const employeesQuery = useQuery({
    queryKey: ["holiday-employees", officeId],
    queryFn: () => {
      const p = new URLSearchParams({ page: "1", pageSize: "200", status: "ACTIVE" });
      if (officeId) p.set("officeId", officeId);
      return employeeApi.list(p);
    },
    enabled: open && employeeMode === "selected"
  });

  const isCustom = !!holidayKey?.startsWith("custom:");

  const applyMutation = useMutation({
    mutationFn: () =>
      operationsApi.applyHoliday({
        kenatKey: isCustom ? undefined : holidayKey!,
        holidayId: isCustom ? holidayKey!.slice("custom:".length) : detail?.holidayId ?? undefined,
        year,
        officeId: officeId || null,
        employeeIds: employeeMode === "selected" ? selectedEmployeeIds : undefined,
        notify,
        message: message.trim() || null
      }),
    onSuccess: (data) => {
      toast.success(
        `Applied to ${data.application.assignmentCount} employee(s)` +
          (data.application.notifiedCount ? `, notified ${data.application.notifiedCount}` : "") +
          (data.application.skippedAlreadyAssigned ? ` (${data.application.skippedAlreadyAssigned} already assigned)` : "")
      );
      if (data.application.alreadyCheckedIn) {
        toast.message(`${data.application.alreadyCheckedIn} employee(s) already had a timesheet that day`);
      }
      onApplied();
      onOpenChange(false);
      setSelectedEmployeeIds([]);
      setEmployeeMode("all");
      setMessage("");
      setNotify(true);
      setOfficeId("");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to apply holiday");
    }
  });

  const holiday = detail as CatalogHoliday | undefined;
  const employees = ((employeesQuery.data as any)?.items ?? (employeesQuery.data as any)?.data?.items ?? []).filter((e: any) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q);
  });

  const defaultMessage = holiday ? `${holiday.nameEn} — no work on this day. Enjoy the holiday.` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="size-5 text-sky-600" />
          {holiday?.nameEn ?? "Holiday"}
        </DialogTitle>
        <DialogDescription>
          {isCustom
            ? "Apply this custom rest day to mark attendance as Holiday for the selected employees."
            : "Holidays are not applied by default. Choose office and employees, then apply — or use Auto on the list."}
        </DialogDescription>

        {detailLoading || !holiday ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading holiday…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-medium">{holiday.nameAm || (isCustom ? "Custom rest day" : "")}</div>
              <div className="mt-1 text-slate-600">{holiday.description}</div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Gregorian: {formatDate(holiday.gregorianDate)}</span>
                {holiday.ethiopian?.year ? (
                  <span>
                    Ethiopian: {holiday.ethiopian.day}/{holiday.ethiopian.month}/{holiday.ethiopian.year}
                  </span>
                ) : null}
                {holiday.applied ? <span className="text-sky-700">Already applied to {holiday.assignedEmployees}</span> : null}
                {holiday.autoApply ? <span className="text-emerald-700">Auto apply on</span> : null}
              </div>
            </div>

            <ScopeFields
              showOfficeFilter={showOfficeFilter}
              officeId={officeId}
              onOfficeChange={setOfficeId}
              employeeMode={employeeMode}
              onEmployeeModeChange={(mode) => {
                setEmployeeMode(mode);
                setSelectedEmployeeIds([]);
              }}
              employeeSearch={employeeSearch}
              onEmployeeSearchChange={setEmployeeSearch}
              employees={employees}
              employeesLoading={employeesQuery.isLoading}
              selectedEmployeeIds={selectedEmployeeIds}
              onToggleEmployee={(id, checked) =>
                setSelectedEmployeeIds((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]))
              }
              notify={notify}
              onNotifyChange={setNotify}
              message={message}
              onMessageChange={setMessage}
              defaultMessage={defaultMessage}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applyMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || (employeeMode === "selected" && selectedEmployeeIds.length === 0)}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Applying…
                  </>
                ) : (
                  "Apply holiday"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateCustomHolidayDialog({
  open,
  onOpenChange,
  showOfficeFilter,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showOfficeFilter: boolean;
  onCreated: () => void;
}) {
  const [nameEn, setNameEn] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [officeId, setOfficeId] = useState("");
  const [employeeMode, setEmployeeMode] = useState<"all" | "selected">("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [applyNow, setApplyNow] = useState(true);
  const [autoApply, setAutoApply] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ["holiday-employees", officeId],
    queryFn: () => {
      const p = new URLSearchParams({ page: "1", pageSize: "200", status: "ACTIVE" });
      if (officeId) p.set("officeId", officeId);
      return employeeApi.list(p);
    },
    enabled: open && employeeMode === "selected"
  });

  const employees = ((employeesQuery.data as any)?.items ?? (employeesQuery.data as any)?.data?.items ?? []).filter((e: any) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q);
  });

  const createMutation = useMutation({
    mutationFn: () =>
      operationsApi.createCustomHoliday({
        nameEn: nameEn.trim(),
        nameAm: nameAm.trim() || null,
        description: description.trim() || null,
        gregorianDates: selectedDates,
        officeId: officeId || null,
        employeeIds: employeeMode === "selected" ? selectedEmployeeIds : undefined,
        notify,
        message: message.trim() || null,
        applyNow,
        autoApply
      }),
    onSuccess: (data) => {
      toast.success(
        `Created ${data.holidays.length} custom day(s)` +
          (data.applications.length
            ? `, applied to ${data.applications.reduce((n, a) => n + a.assignmentCount, 0)} assignment(s)`
            : "")
      );
      onCreated();
      onOpenChange(false);
      setNameEn("");
      setNameAm("");
      setDescription("");
      setSelectedDates([]);
      setOfficeId("");
      setSelectedEmployeeIds([]);
      setEmployeeMode("all");
      setMessage("");
      setNotify(true);
      setApplyNow(true);
      setAutoApply(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create custom day")
  });

  const defaultMessage = nameEn.trim()
    ? `${nameEn.trim()} — no work on this day. Enjoy the holiday.`
    : "Custom rest day — no work on this day.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <Plus className="size-5 text-sky-600" />
          Add custom rest day
        </DialogTitle>
        <DialogDescription>
          Not a public holiday — a company rest day you name and approve (e.g. extra day after a holiday). Click days on the calendar to add multiple dates.
        </DialogDescription>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Extra rest after Enkutatash" />
          </div>
          <div className="space-y-1.5">
            <Label>Name (Amharic)</Label>
            <Input value={nameAm} onChange={(e) => setNameAm(e.target.value)} />
          </div>

          <MultiDateCalendar value={selectedDates} onChange={setSelectedDates} label="Dates" max={14} />

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
          </div>

          <ScopeFields
            showOfficeFilter={showOfficeFilter}
            officeId={officeId}
            onOfficeChange={setOfficeId}
            employeeMode={employeeMode}
            onEmployeeModeChange={(mode) => {
              setEmployeeMode(mode);
              setSelectedEmployeeIds([]);
            }}
            employeeSearch={employeeSearch}
            onEmployeeSearchChange={setEmployeeSearch}
            employees={employees}
            employeesLoading={employeesQuery.isLoading}
            selectedEmployeeIds={selectedEmployeeIds}
            onToggleEmployee={(id, checked) =>
              setSelectedEmployeeIds((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]))
            }
            notify={notify}
            onNotifyChange={setNotify}
            message={message}
            onMessageChange={setMessage}
            defaultMessage={defaultMessage}
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={applyNow} onChange={(e) => setApplyNow(e.target.checked)} />
            Apply now (mark attendance as Holiday)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
            Auto-apply on this date (if not applying now, or for future runs)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !nameEn.trim() ||
                selectedDates.length === 0 ||
                (employeeMode === "selected" && selectedEmployeeIds.length === 0)
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
                </>
              ) : (
                "Create custom day"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScopeFields({
  showOfficeFilter,
  officeId,
  onOfficeChange,
  employeeMode,
  onEmployeeModeChange,
  employeeSearch,
  onEmployeeSearchChange,
  employees,
  employeesLoading,
  selectedEmployeeIds,
  onToggleEmployee,
  notify,
  onNotifyChange,
  message,
  onMessageChange,
  defaultMessage
}: {
  showOfficeFilter: boolean;
  officeId: string;
  onOfficeChange: (v: string) => void;
  employeeMode: "all" | "selected";
  onEmployeeModeChange: (mode: "all" | "selected") => void;
  employeeSearch: string;
  onEmployeeSearchChange: (v: string) => void;
  employees: any[];
  employeesLoading: boolean;
  selectedEmployeeIds: string[];
  onToggleEmployee: (id: string, currentlyChecked: boolean) => void;
  notify: boolean;
  onNotifyChange: (v: boolean) => void;
  message: string;
  onMessageChange: (v: string) => void;
  defaultMessage: string;
}) {
  return (
    <>
      <OfficeFilter visible={showOfficeFilter} value={officeId} onChange={onOfficeChange} />

      <div className="space-y-1.5">
        <Label>Employees</Label>
        <Select value={employeeMode} onChange={(e) => onEmployeeModeChange(e.target.value as "all" | "selected")}>
          <option value="all">All employees{officeId ? " in selected office" : ""}</option>
          <option value="selected">Choose employees…</option>
        </Select>
      </div>

      {employeeMode === "selected" && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Input placeholder="Search employees" value={employeeSearch} onChange={(e) => onEmployeeSearchChange(e.target.value)} />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {employeesLoading && <div className="text-xs text-slate-500">Loading…</div>}
            {employees.map((e) => {
              const checked = selectedEmployeeIds.includes(e.id);
              return (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={checked} onChange={() => onToggleEmployee(e.id, checked)} />
                  <span>{employeeName(e)}</span>
                  <span className="text-xs text-slate-400">{e.employeeCode}</span>
                </label>
              );
            })}
            {!employeesLoading && !employees.length && <div className="text-xs text-slate-500">No employees found.</div>}
          </div>
          <div className="text-xs text-slate-500">{selectedEmployeeIds.length} selected</div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => onNotifyChange(e.target.checked)} />
        Send push notification to employees
      </label>

      {notify && (
        <div className="space-y-1.5">
          <Label>Notification message</Label>
          <Input placeholder={defaultMessage} value={message} onChange={(e) => onMessageChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
