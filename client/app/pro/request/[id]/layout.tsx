import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  return genMeta({
    title: "Job Request Details",
    description: "View detailed information about a job request and respond to the customer.",
    url: `/pro/request/${id}`,
    noindex: true, // Private page
  });
}

export default function ProRequestDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
