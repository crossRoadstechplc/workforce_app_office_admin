import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/ui/badge";
describe("StatusBadge",()=>{it("humanizes status values",()=>{render(<StatusBadge status="MISSING_CHECKOUT"/>);expect(screen.getByText("MISSING CHECKOUT")).toBeInTheDocument();});});
