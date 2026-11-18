import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiDocView } from "@/components/developer/api-doc-view";
import { meetingBookingDoc } from "@/features/developer/docs/meeting-booking";
import { findApiDoc } from "@/features/developer/registry";
import { curlSample, postmanCollection } from "@/features/developer/samples";

describe("developer docs", () => {
  it("registers the meeting booking guide", () => {
    expect(findApiDoc("meeting-booking")).toBe(meetingBookingDoc);
    expect(findApiDoc("nope")).toBeUndefined();
  });

  it("renders every endpoint with request and response samples", () => {
    render(<ApiDocView doc={meetingBookingDoc} />);
    for (const endpoint of meetingBookingDoc.endpoints) {
      const section = document.getElementById(endpoint.id)!;
      expect(section).toBeInTheDocument();
      expect(within(section).getByRole("heading", { name: endpoint.title })).toBeInTheDocument();
    }
    const create = document.getElementById("create-booking")!;
    expect(within(create).getByText(/curl -X POST/)).toBeInTheDocument();
    fireEvent.click(within(create).getByRole("tab", { name: /409 Room taken/ }));
    expect(within(create).getByText(/ROOM_UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Webhooks/ })).toBeInTheDocument();
  });

  it("builds a cURL sample and Postman collection from the doc", () => {
    const create = meetingBookingDoc.endpoints.find((e) => e.id === "create-booking")!;
    const curl = curlSample(meetingBookingDoc, create);
    expect(curl).toContain(`${meetingBookingDoc.baseUrl}/bookings`);
    expect(curl).toContain('"employeeCode": "SPX001"');

    const collection = postmanCollection(meetingBookingDoc);
    expect(collection.item).toHaveLength(meetingBookingDoc.endpoints.length);
    expect(collection.variable.map((v) => v.key)).toEqual(expect.arrayContaining(["baseUrl", "apiKey", "roomId", "id", "employeeCode"]));
    expect(collection.item.find((i) => i.name === "Room availability")?.request.url.raw).toBe("{{baseUrl}}/rooms/{{roomId}}/availability?date=2026-11-20");
  });
});
