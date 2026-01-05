import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  return genMeta({
    title: "Conversation",
    description: "Continue your conversation with a customer about their service request.",
    url: `/pro/messages/${id}`,
    noindex: true, // Private page
  });
}

export default function ProConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
