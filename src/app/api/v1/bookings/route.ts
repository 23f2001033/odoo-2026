import { apiHandler } from "@/lib/api";
import { bookingCreateSchema, bookingListSchema } from "@/modules/booking/validators";
import { createBooking, listBookings } from "@/modules/booking/service";

// GET is unrestricted to any authenticated user — seeing a resource's
// availability is the whole point of the calendar view (spec Screen 6).
export const GET = apiHandler({}, ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return listBookings(bookingListSchema.parse(params));
});

export const POST = apiHandler(
  { permission: "booking.create", body: bookingCreateSchema },
  ({ user, body }) => createBooking(user, body)
);
