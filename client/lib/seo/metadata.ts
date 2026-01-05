import { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mestermind.com";
const siteName = "Mestermind";
const defaultDescription = "Home improvement, home repair, and home services made easy. Connect with trusted professionals for all your home service needs.";

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: object;
}

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = "/og-image.jpg",
    url,
    type = "website",
    noindex = false,
    nofollow = false,
  } = config;

  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const imageUrl = image.startsWith("http") ? image : `${siteUrl}${image}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
      },
    },
    openGraph: {
      type,
      url: fullUrl,
      title: fullTitle,
      description,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: "@mestermind",
    },
    alternates: {
      canonical: fullUrl,
    },
    metadataBase: new URL(siteUrl),
  };
}

// Predefined SEO configs for common pages
export const seoConfigs = {
  home: {
    title: "Find Trusted Home Service Professionals",
    description: "Connect with verified home service professionals for cleaning, plumbing, electrical, HVAC, and more. Get quotes, compare prices, and book services with confidence.",
    keywords: ["home services", "home improvement", "home repair", "professional services", "service providers", "home maintenance", "cleaning services", "plumbing", "electrical", "HVAC"],
    url: "/",
  },
  login: {
    title: "Sign In to Your Account",
    description: "Sign in to your Mestermind account to manage your home service requests, connect with professionals, and track your projects.",
    keywords: ["login", "sign in", "account", "mestermind login"],
    url: "/login",
  },
  register: {
    title: "Create Your Account",
    description: "Join Mestermind to connect with trusted home service professionals. Create your free account and start your home improvement journey today.",
    keywords: ["sign up", "register", "create account", "join mestermind"],
    url: "/register",
  },
  results: {
    title: "Find Home Service Professionals Near You",
    description: "Browse verified home service professionals in your area. Compare profiles, read reviews, and get quotes from top-rated service providers.",
    keywords: ["find professionals", "service providers", "local services", "home service search", "professional directory"],
    url: "/results",
  },
  proLanding: {
    title: "Join Mestermind as a Professional",
    description: "Grow your home service business with Mestermind. Get qualified leads, manage projects, and connect with customers looking for your expertise.",
    keywords: ["join as professional", "service provider signup", "professional registration", "grow business", "get leads"],
    url: "/become-a-pro",
  },
  mesterDetail: (businessName: string, city?: string) => ({
    title: `${businessName}${city ? ` - ${city}` : ""} | Professional Profile`,
    description: `View ${businessName}'s professional profile, services, reviews, and portfolio. Contact ${businessName}${city ? ` in ${city}` : ""} for your home service needs.`,
    keywords: [businessName, city || "", "professional profile", "home services", "service provider", "reviews"],
    type: "profile" as const,
    url: `/mester/[id]`,
  }),
};
