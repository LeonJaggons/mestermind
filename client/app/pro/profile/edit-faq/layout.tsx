import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Edit FAQ",
  description: "Manage frequently asked questions for your professional profile.",
  url: "/pro/profile/edit-faq",
  noindex: true, // Private page
});

export default function ProEditFaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
