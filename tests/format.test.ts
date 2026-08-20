import { describe, it, expect } from "vitest";
import { minutesToHours, employeeName, humanizeKey } from "@/lib/utils/format";

describe("format helpers", () => {
  it("formats minutes", () => expect(minutesToHours(515)).toBe("8h 35m"));
  it("formats employee", () => expect(employeeName({ firstName: "Abel", lastName: "Bekele" })).toBe("Abel Bekele"));
  it("humanizes keys", () => expect(humanizeKey("LEAVE_APPROVED")).toBe("Leave Approved"));
});
