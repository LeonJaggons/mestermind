import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Your Professional Profile",
  description: "Manage your professional profile, showcase your work, respond to reviews, and update your business information.",
  keywords: ["professional profile", "business profile", "manage profile", "update profile"],
  url: "/pro/profile",
  noindex: true, // Private page
});

export default function ProProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
