import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Professional Onboarding",
  description: "Complete your professional profile setup to start receiving job opportunities.",
  url: "/become-a-pro/onboarding",
  noindex: true, // Private onboarding flow
});

export default function ProOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
