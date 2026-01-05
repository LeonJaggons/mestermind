import { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo/metadata";
import StructuredData from "@/components/StructuredData";
import { API_BASE_URL } from "@/lib/api/config";

interface Props {
  params: Promise<{ id: string }>;
}

async function getMesterData(id: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/pro-profiles/${id}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching mester data:", error);
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mester = await getMesterData(id);
  
  if (mester) {
    const businessName = mester.business_name || "Professional";
    const city = mester.city || "";
    const intro = mester.business_intro || "";
    const description = intro 
      ? `${businessName}${city ? ` in ${city}` : ""} - ${intro.substring(0, 120)}...`
      : `View ${businessName}'s professional profile, services, reviews, and portfolio. Contact ${businessName}${city ? ` in ${city}` : ""} for your home service needs.`;
    
    return genMeta({
      title: `${businessName}${city ? ` - ${city}` : ""} | Professional Profile`,
      description,
      keywords: [
        businessName,
        city,
        "professional profile",
        "home services",
        "service provider",
        "reviews",
        "home improvement",
        mester.services?.map((s: any) => s.name).join(", ") || "",
      ].filter(Boolean),
      type: "profile",
      url: `/mester/${id}`,
      image: mester.profile_image_url || "/og-image.jpg",
    });
  }
  
  // Fallback metadata
  return genMeta({
    title: "Professional Profile",
    description: "View professional profile, services, reviews, and portfolio for home service professionals.",
    url: `/mester/${id}`,
  });
}

export default async function MesterDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mester = await getMesterData(id);
  
  let structuredData = null;
  
  if (mester) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mestermind.com";
    const services = mester.services?.map((s: any) => ({
      "@type": "Service",
      "name": s.name,
      "description": s.description || s.name
    })) || [];
    
    structuredData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${siteUrl}/mester/${id}`,
      "name": mester.business_name,
      "description": mester.business_intro || mester.about_business || `${mester.business_name} - Professional home service provider`,
      "image": mester.profile_image_url ? `${siteUrl}${mester.profile_image_url}` : `${siteUrl}/og-image.jpg`,
      "url": `${siteUrl}/mester/${id}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": mester.city || "",
        "postalCode": mester.zip_code || "",
        "streetAddress": mester.street_address || "",
      },
      "foundingDate": mester.year_founded ? `${mester.year_founded}` : undefined,
      "numberOfEmployees": mester.number_of_employees ? {
        "@type": "QuantitativeValue",
        "value": mester.number_of_employees
      } : undefined,
      "areaServed": mester.service_distance ? {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "addressLocality": mester.city || ""
        },
        "geoRadius": {
          "@type": "Distance",
          "value": mester.service_distance,
          "unitCode": "KMT"
        }
      } : undefined,
      "hasOfferCatalog": services.length > 0 ? {
        "@type": "OfferCatalog",
        "name": "Services",
        "itemListElement": services.map((service: any, index: number) => ({
          "@type": "OfferCatalogItem",
          "position": index + 1,
          "itemOffered": service
        }))
      } : undefined,
    };
  }
  
  return (
    <>
      {structuredData && <StructuredData data={structuredData} />}
      {children}
    </>
  );
}
