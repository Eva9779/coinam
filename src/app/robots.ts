
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://coin-vault-v1.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/wallet/', 
        '/settings/', 
        '/bot/', 
        '/buy/', 
        '/withdraw/', 
        '/trade/', 
        '/transactions/', 
        '/alerts/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
