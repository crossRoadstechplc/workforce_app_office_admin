import { describe, it, expect } from "vitest";
import { minutesToHours, formatLateMinutes, employeeName, humanizeKey } from "@/lib/utils/format";

describe("format helpers", () => {
  it("formats minutes", () => expect(minutesToHours(515)).toBe("8h 35m"));
  it("formats late minutes as hours and minutes", () => {
    expect(formatLateMinutes(92)).toBe("1H 32min");
    expect(formatLateMinutes(32)).toBe("32min");
    expect(formatLateMinutes(60)).toBe("1H");
    expect(formatLateMinutes(0)).toBe("—");
  });
  it("formats employee", () => expect(employeeName({ firstName: "Abel", lastName: "Bekele" })).toBe("Abel Bekele"));
  it("humanizes keys", () => expect(humanizeKey("LEAVE_APPROVED")).toBe("Leave Approved"));
});
