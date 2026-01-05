import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mestermind.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/become-a-pro`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/results`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  // Note: Dynamic pages (like /mester/[id]) would need to be fetched from the API
  // For now, we'll include the pattern in the sitemap
  // In production, you'd want to fetch all mester IDs and generate entries

  return staticPages;
}
