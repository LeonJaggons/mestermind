import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Reviews",
  description: "View and manage customer reviews. Respond to reviews and track your rating to build trust with potential customers.",
  keywords: ["reviews", "customer reviews", "ratings", "feedback", "review management"],
  url: "/pro/reviews",
  noindex: true, // Private page
});

export default function ProReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
