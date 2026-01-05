import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Appointments",
  description: "Manage your appointments with home service professionals. View upcoming appointments and schedule new ones.",
  keywords: ["appointments", "schedule", "booking", "service appointments"],
  url: "/customer/appointments",
  noindex: true, // Private page
});

export default function CustomerAppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
