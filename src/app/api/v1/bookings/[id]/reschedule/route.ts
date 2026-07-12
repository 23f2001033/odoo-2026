import { apiHandler } from "@/lib/api";
import { bookingRescheduleSchema } from "@/modules/booking/validators";
import { rescheduleBooking } from "@/modules/booking/service";

export const POST = apiHandler(
  { permission: "booking.create", body: bookingRescheduleSchema },
  ({ user, body, params }) => rescheduleBooking(user, params.id, body)
);
