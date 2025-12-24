
export enum MarketingPillar {
  SEO = 'SEO',
  AEO = 'AEO',
  YOUTUBE = 'YouTube',
  LOCAL_SEO = 'Local SEO',
  SOCIAL = 'Social',
  REVIEWS = 'Reviews'
}

export interface PillarData {
  id: MarketingPillar;
  title: string;
  objective: string;
  description: string;
  icon: string;
  color: string;
}

export interface AuditScores {
  seo: number;
  performance: number;
  accessibility: number;
  bestPractices: number;
  aeoReadiness: number;
}

export interface ComparisonData {
  current: AuditScores;
  target: AuditScores;
}

export interface CompetitorData {
  name: string;
  url: string;
  advantage: string;
  gap: string;
}

export interface KeywordData {
  term: string;
  intent: 'Transactional' | 'Informational' | 'Navigational';
  volume?: string;
  difficulty?: string;
}

export interface AIResponse {
  text: string;
  comparison?: ComparisonData;
  theDifference: string;
  findings: string[]; 
  urls?: { title: string; uri: string }[];
  competitors?: CompetitorData[];
  keywords?: KeywordData[];
  metadata?: {
    channelExists?: boolean;
    channelLink?: string;
    reviewSources?: { source: string; count: number; rating?: number }[];
  };
}
