import { describe, it, expect } from "vitest";
import { minutesToHours, formatLateMinutes, employeeName, humanizeKey } from "@/lib/utils/format";

describe("format helpers", () => {
  it("formats minutes", () => expect(minutesToHours(515)).toBe("8h 35m"));
  it("formats late minutes as hours and minutes", () => {
    expect(formatLateMinutes(92)).toBe("1h 32m");
    expect(formatLateMinutes(32)).toBe("32m");
    expect(formatLateMinutes(60)).toBe("1h");
    expect(formatLateMinutes(300)).toBe("5h");
    expect(formatLateMinutes(0)).toBe("-");
  });
  it("formats employee", () => expect(employeeName({ firstName: "Abel", lastName: "Bekele" })).toBe("Abel Bekele"));
  it("humanizes keys", () => expect(humanizeKey("LEAVE_APPROVED")).toBe("Leave Approved"));
});
