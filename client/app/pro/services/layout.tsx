import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Manage Your Services",
  description: "Manage the services you offer, view analytics, and optimize your professional profile to attract more customers.",
  keywords: ["manage services", "professional services", "service management", "profile optimization"],
  url: "/pro/services",
  noindex: true, // Private page
});

export default function ProServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
