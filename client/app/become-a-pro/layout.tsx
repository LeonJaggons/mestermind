import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Join Mestermind as a Professional",
  description: "Grow your home service business with Mestermind. Get qualified leads, manage projects, and connect with customers looking for your expertise.",
  keywords: ["join as professional", "service provider signup", "professional registration", "grow business", "get leads", "home service professionals"],
  url: "/become-a-pro",
});

export default function BecomeAProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
