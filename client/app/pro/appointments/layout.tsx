import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Appointments",
  description: "Manage your appointments and schedule with customers. View upcoming appointments and manage your calendar.",
  keywords: ["appointments", "schedule", "calendar", "booking management"],
  url: "/pro/appointments",
  noindex: true, // Private page
});

export default function ProAppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
