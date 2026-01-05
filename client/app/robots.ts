import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mestermind.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/pro/jobs',
          '/pro/services',
          '/pro/profile',
          '/pro/opportunities',
          '/pro/subscribe',
          '/pro/messages',
          '/pro/appointments',
          '/pro/payments',
          '/pro/request',
          '/become-a-pro/onboarding',
          '/customer/messages',
          '/customer/appointments',
          '/login',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
