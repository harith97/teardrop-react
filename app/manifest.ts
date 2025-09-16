import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Teardrop',
    short_name: 'Teardrop',
    description:
      'Teardrop is a platform for sharing your thoughts and feelings with the world.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FF6B35',
    theme_color: '#FF6B35',
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}


