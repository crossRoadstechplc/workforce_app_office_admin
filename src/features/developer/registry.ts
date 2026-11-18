import { meetingBookingDoc } from "./docs/meeting-booking";
import type { ApiDoc } from "./types";

/** All developer guides shown under Developer in the sidebar. Add new ones here. */
export const apiDocs: ApiDoc[] = [meetingBookingDoc];

export function findApiDoc(slug: string | undefined) {
  return apiDocs.find((doc) => doc.slug === slug);
}
