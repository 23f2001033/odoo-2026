import { apiHandler } from "@/lib/api";
import { cancelBooking } from "@/modules/booking/service";

// Ownership/department scoping (own booking, dept head, or manager/admin) is
// enforced inside the service — the permission gate just requires any
// authenticated booking-capable role.
export const POST = apiHandler(
  { permission: "booking.create" },
  ({ user, params }) => cancelBooking(user, params.id)
);
