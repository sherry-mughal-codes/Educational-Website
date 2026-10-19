import { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/api';

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const data = await getSitemapData();

  if (!data || !data.urls || data.urls.length === 0) {
    // Fallback static sitemap if backend is temporarily unreachable
    return [
      {
        url: `${siteUrl}/`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${siteUrl}/class-9/`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${siteUrl}/class-10/`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${siteUrl}/search/`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${siteUrl}/about/`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${siteUrl}/contact/`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${siteUrl}/privacy-policy/`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${siteUrl}/terms/`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${siteUrl}/disclaimer/`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ];
  }

  return data.urls.map((entry) => ({
    url: `${siteUrl}${entry.path}`,
    lastModified: entry.lastmod ? new Date(entry.lastmod) : new Date(),
    changeFrequency: (entry.changefreq || 'weekly') as
      | 'always'
      | 'hourly'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | 'never',
    priority: parseFloat(entry.priority) || 0.7,
  }));
}
