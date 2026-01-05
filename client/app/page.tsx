import { Metadata } from "next";
import Hero from "@/components/Hero";
import ServiceCategories from "@/components/ServiceCategories";
import TrustSection from "@/components/TrustSection";
import ExploreProjects from "@/components/ExploreProjects";
import ResourcesSection from "@/components/ResourcesSection";
import StructuredData from "@/components/StructuredData";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";

export const metadata: Metadata = genMeta({
  title: "Find Trusted Home Service Professionals",
  description: "Connect with verified home service professionals for cleaning, plumbing, electrical, HVAC, and more. Get quotes, compare prices, and book services with confidence.",
  keywords: ["home services", "home improvement", "home repair", "professional services", "service providers", "home maintenance", "cleaning services", "plumbing", "electrical", "HVAC", "handyman", "contractors"],
  url: "/",
});

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Mestermind",
  "url": "https://mestermind.com",
  "description": "Home improvement, home repair, and home services made easy",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://mestermind.com/results?service={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Mestermind",
  "url": "https://mestermind.com",
  "logo": "https://mestermind.com/og-image.jpg",
  "description": "Home improvement, home repair, and home services made easy",
  "sameAs": [
    // Add social media links when available
  ]
};

const serviceStructuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Home Services Marketplace",
  "provider": {
    "@type": "Organization",
    "name": "Mestermind"
  },
  "areaServed": "Worldwide",
  "description": "Connect with verified home service professionals for all your home improvement needs"
};

export default function Home() {
  return (
    <div>
      <StructuredData data={websiteStructuredData} />
      <StructuredData data={organizationStructuredData} />
      <StructuredData data={serviceStructuredData} />
      <Hero />
      <ServiceCategories />
      <TrustSection />
      <ExploreProjects />
      <ResourcesSection />
    </div>
  );
}
