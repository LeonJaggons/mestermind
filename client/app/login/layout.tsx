import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Sign In to Your Account",
  description: "Sign in to your Mestermind account to manage your home service requests, connect with professionals, and track your projects.",
  keywords: ["login", "sign in", "account", "mestermind login", "customer login", "professional login"],
  url: "/login",
  noindex: true, // Login pages typically shouldn't be indexed
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
