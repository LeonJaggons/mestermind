import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Job Opportunities",
  description: "View and manage your job invitations and opportunities. Respond to customer requests and grow your home service business.",
  keywords: ["job opportunities", "professional jobs", "service requests", "customer invitations", "manage jobs"],
  url: "/pro/jobs",
  noindex: true, // Private page, shouldn't be indexed
});

export default function ProJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
