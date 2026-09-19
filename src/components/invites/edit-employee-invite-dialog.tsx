"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { employeeApi } from "@/features/employees/employee-api";
import { inviteApi, type InviteRecord } from "@/features/invites/invite-api";
import { EmployeeAssignmentSelects } from "@/components/employees/employee-form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditEmployeeInviteDialogProps = {
  invite: InviteRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditEmployeeInviteDialog({ invite, open, onOpenChange }: EditEmployeeInviteDialogProps) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [evaluationTemplateId, setEvaluationTemplateId] = useState("");

  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices, enabled: open });
  const schedules = useQuery({ queryKey: ["schedules", "select"], queryFn: employeeApi.schedules, enabled: open });
  const departments = useQuery({ queryKey: ["departments", "select"], queryFn: employeeApi.departments, enabled: open });
  const evaluationTemplates = useQuery({ queryKey: ["evaluation-templates", "select"], queryFn: employeeApi.evaluationTemplates, enabled: open });

  useEffect(() => {
    if (!open || !invite) return;
    setEmail(invite.email);
    setEmploymentStartDate(invite.payload?.employmentStartDate ?? "");
    setJobTitle(invite.payload?.jobTitle ?? "");
    setOfficeId(invite.officeId ?? "");
    setScheduleId(invite.scheduleId ?? "");
    setDepartmentId(invite.payload?.departmentId ?? "");
    setEvaluationTemplateId(invite.payload?.evaluationTemplateId ?? "");
  }, [open, invite]);

  const save = useMutation({
    mutationFn: () => {
      if (!invite) throw new Error("No invite selected");
      return inviteApi.update(invite.id, {
        email: email.trim(),
        officeId: officeId || null,
        scheduleId: scheduleId || null,
        employmentStartDate: employmentStartDate || undefined,
        jobTitle: jobTitle || null,
        departmentId: departmentId || null,
        evaluationTemplateId: evaluationTemplateId || null
      });
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["employee-invites"] });
      if (result.emailChanged) {
        toast.success(
          result.emailSent
            ? "Invite updated and a new email was sent to the corrected address"
            : result.emailError ?? "Invite updated, but the email could not be sent"
        );
      } else {
        toast.success("Invite updated");
      }
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit employee invite</DialogTitle>
        <DialogDescription>
          Fix the email or pre-filled details before the employee completes their profile. Changing the email invalidates the old link and sends a new invite.
        </DialogDescription>
        <form
          className="mt-6 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="invite-start-date">Start date</Label>
            <Input
              id="invite-start-date"
              type="date"
              value={employmentStartDate}
              onChange={(e) => setEmploymentStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invite-job-title">Job title</Label>
            <Input id="invite-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <EmployeeAssignmentSelects
            offices={offices.data}
            schedules={schedules.data}
            departments={departments.data}
            evaluationTemplates={evaluationTemplates.data}
            officeId={officeId}
            scheduleId={scheduleId}
            departmentId={departmentId}
            evaluationTemplateId={evaluationTemplateId}
            onOfficeChange={setOfficeId}
            onScheduleChange={setScheduleId}
            onDepartmentChange={setDepartmentId}
            onEvaluationTemplateChange={setEvaluationTemplateId}
          />
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !email.trim()}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
