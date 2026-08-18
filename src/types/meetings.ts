export type MeetingRoom = {
  id: string;
  officeId: string;
  name: string;
  location?: string | null;
  capacity: number;
  amenities: string[];
  isActive: boolean;
  office?: { id: string; name: string; timezone?: string };
  _count?: { bookings: number };
};

export type MeetingBooking = {
  id: string;
  title: string;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
  status: "BOOKED" | "CANCELLED";
  officeId: string;
  roomId: string;
  organizerName?: string | null;
  rescheduledAt?: string | null;
  cancelledAt?: string | null;
  room?: { id: string; name: string; location?: string | null; capacity?: number };
  office?: { id: string; name: string; timezone?: string };
  bookedBy?: { id: string; email: string };
  organizer?: { id: string; firstName: string; lastName: string; employeeCode?: string; jobTitle?: string | null } | null;
};

export type MeetingBookingList = {
  items: MeetingBooking[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  counts?: { upcoming: number; today: number; total: number };
};

export type MeetingRoomList = {
  items: MeetingRoom[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
