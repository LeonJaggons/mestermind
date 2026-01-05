import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  return genMeta({
    title: "Appointment Details",
    description: "View and manage appointment details with your customer.",
    url: `/pro/appointments/${id}`,
    noindex: true, // Private page
  });
}

export default function ProAppointmentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
