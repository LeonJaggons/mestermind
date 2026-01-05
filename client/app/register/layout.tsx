import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Create Your Account",
  description: "Join Mestermind to connect with trusted home service professionals. Create your free account and start your home improvement journey today.",
  keywords: ["sign up", "register", "create account", "join mestermind", "customer registration", "professional registration"],
  url: "/register",
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
