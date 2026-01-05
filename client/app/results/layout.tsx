import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = genMeta({
  title: "Find Home Service Professionals Near You",
  description: "Browse verified home service professionals in your area. Compare profiles, read reviews, and get quotes from top-rated service providers.",
  keywords: ["find professionals", "service providers", "local services", "home service search", "professional directory", "compare services", "service quotes"],
  url: "/results",
});

const itemListStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Home Service Professionals",
  "description": "Browse and compare verified home service professionals",
  "url": "https://mestermind.com/results"
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData data={itemListStructuredData} />
      {children}
    </>
  );
}
