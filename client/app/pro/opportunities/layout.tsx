import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Browse Job Opportunities",
  description: "Browse available job opportunities that match your services. Find new customers and grow your home service business.",
  keywords: ["job opportunities", "browse jobs", "available jobs", "find customers", "service opportunities"],
  url: "/pro/opportunities",
  noindex: true, // Private page
});

export default function ProOpportunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
