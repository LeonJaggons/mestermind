import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Messages",
  description: "Manage your conversations with customers and respond to inquiries about your services.",
  keywords: ["messages", "conversations", "customer communication"],
  url: "/pro/messages",
  noindex: true, // Private page
});

export default function ProMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
