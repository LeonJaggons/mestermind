import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Messages",
  description: "Manage your conversations with home service professionals and track your service requests.",
  keywords: ["messages", "conversations", "customer communication"],
  url: "/customer/messages",
  noindex: true, // Private page
});

export default function CustomerMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
