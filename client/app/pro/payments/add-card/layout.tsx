import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Add Payment Method",
  description: "Add a new payment method to your account for seamless transactions.",
  url: "/pro/payments/add-card",
  noindex: true, // Private page
});

export default function ProAddCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
