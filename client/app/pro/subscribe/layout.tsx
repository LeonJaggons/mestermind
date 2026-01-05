import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Subscribe to Mestermind Pro",
  description: "Unlock access to all job opportunities, browse available jobs, and contact customers directly. Subscribe to Mestermind Pro today.",
  keywords: ["mestermind pro", "subscription", "premium features", "job opportunities", "professional subscription"],
  url: "/pro/subscribe",
  noindex: true, // Private/subscription page
});

export default function ProSubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
