import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Payments & Billing",
  description: "Manage your payments, view transaction history, and update your payment methods.",
  keywords: ["payments", "billing", "transactions", "payment methods"],
  url: "/pro/payments",
  noindex: true, // Private page
});

export default function ProPaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
