
import { MarketingPillar, PillarData } from './types';

export const PILLARS: PillarData[] = [
  {
    id: MarketingPillar.SEO,
    title: 'SEO',
    objective: 'Brings Search Traffic',
    description: 'Optimize for organic search rankings to capture high-intent users.',
    icon: 'fa-solid fa-magnifying-glass-chart',
    color: 'from-blue-500 to-cyan-400'
  },
  {
    id: MarketingPillar.AEO,
    title: 'AEO',
    objective: 'Brings AI Recommendations',
    description: 'Optimize content structure for LLMs, answer engines, and voice search.',
    icon: 'fa-solid fa-microchip',
    color: 'from-purple-500 to-indigo-400'
  },
  {
    id: MarketingPillar.YOUTUBE,
    title: 'YouTube',
    objective: 'Builds Trust',
    description: 'Video content creates authority and human connection.',
    icon: 'fa-brands fa-youtube',
    color: 'from-red-600 to-rose-400'
  },
  {
    id: MarketingPillar.LOCAL_SEO,
    title: 'Local SEO',
    objective: 'Brings Calls',
    description: 'Be visible when customers are looking for nearby services.',
    icon: 'fa-solid fa-location-dot',
    color: 'from-orange-500 to-amber-400'
  },
  {
    id: MarketingPillar.SOCIAL,
    title: 'Social',
    objective: 'Brand Remembered',
    description: 'Stay top-of-mind through consistent engagement.',
    icon: 'fa-solid fa-share-nodes',
    color: 'from-pink-500 to-rose-400'
  },
  {
    id: MarketingPillar.REVIEWS,
    title: 'Reviews',
    objective: 'Converts Leads',
    description: 'Social proof is the final nudge for prospects.',
    icon: 'fa-solid fa-star',
    color: 'from-emerald-500 to-teal-400'
  }
];
