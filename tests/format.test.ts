import { describe,it,expect } from "vitest";import { minutesToHours,employeeName } from "@/lib/utils/format";
describe("format helpers",()=>{it("formats minutes",()=>expect(minutesToHours(515)).toBe("8h 35m"));it("formats employee",()=>expect(employeeName({firstName:"Abel",lastName:"Bekele"})).toBe("Abel Bekele"));});
