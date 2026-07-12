import { redirect } from "next/navigation";

// Middleware handles auth: logged-out users land on /login instead.
export default function Home() {
  redirect("/dashboard");
}
