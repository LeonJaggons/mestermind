import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  return genMeta({
    title: "Conversation",
    description: "Continue your conversation with a home service professional about your service request.",
    url: `/customer/messages/${id}`,
    noindex: true, // Private page
  });
}

export default function CustomerConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
