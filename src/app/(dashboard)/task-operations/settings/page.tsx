import { redirect } from "next/navigation";

/** Task Operations is always on — setup page removed. */
export default function TaskOperationsSettingsPage() {
  redirect("/task-operations");
}
