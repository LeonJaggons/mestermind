import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Add Balance",
  description: "Add funds to your account balance for purchasing leads and services.",
  url: "/pro/payments/add-balance",
  noindex: true, // Private page
});

export default function ProAddBalanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
