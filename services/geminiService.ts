
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, MarketingPillar } from "../types";

export class GeminiService {
  private getCacheKey(pillar: MarketingPillar, url: string): string {
    return `audit_v5_${pillar}_${url.replace(/[^a-z0-9]/gi, '_')}`;
  }

  async analyzeStrategy(pillar: MarketingPillar, url: string, latLng?: { lat: number; lng: number }): Promise<AIResponse> {
    const cacheKey = this.getCacheKey(pillar, url);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn("Cache parse failed");
      }
    }

    const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let systemInstruction = "You are a world-class forensic marketing analyst. You specialize in COMPETITIVE INTELLIGENCE and KEYWORD AUDITING. For any domain provided, you must identify its top keywords, its competitors, and perform a comparative audit. Search for ACTUAL keyword data, search volume estimates, and user intent (Transactional vs Informational).";
    let tools: any[] = [{ googleSearch: {} }];
    let toolConfig: any = undefined;

    switch (pillar) {
      case MarketingPillar.SEO:
        systemInstruction += " Identify 10-15 high-value keywords for the entire website. Classify them by intent. Find keyword gaps where competitors are winning.";
        break;
      case MarketingPillar.AEO:
        systemInstruction += " Focus on long-tail conversational keywords and question-based queries that trigger AI Overviews.";
        break;
      case MarketingPillar.LOCAL_SEO:
        systemInstruction += " Identify 'near me' and geo-modified keywords. Compare map pack rankings for these specific terms.";
        tools = [{ googleMaps: {} }, { googleSearch: {} }];
        if (latLng) {
          toolConfig = { retrievalConfig: { latLng: { latitude: latLng.lat, longitude: latLng.lng } } };
        }
        break;
      case MarketingPillar.YOUTUBE:
        systemInstruction += " Find top-performing video keywords and tags used by industry leaders in this niche.";
        break;
      case MarketingPillar.SOCIAL:
        systemInstruction += " Identify trending hashtags and brand-related keywords driving social conversations.";
        break;
      case MarketingPillar.REVIEWS:
        systemInstruction += " Find keywords commonly used in customer reviews (sentiment-based keywords) and compare them to rivals.";
        break;
    }

    const mainPrompt = `Deep-scan domain "${url}" for the "${pillar}" pillar.
    REQUIRED ACTIONS:
    1. Extract a "Keyword Landscape" for the entire website: 5-10 primary and secondary keywords.
    2. Identify 2-3 top competitors.
    3. Perform a side-by-side comparison of ${pillar} metrics.
    4. Provide 3-5 forensic discoveries from the search data.
    5. Draft a roadmap to dominate these keywords.`;

    const modelName = pillar === MarketingPillar.LOCAL_SEO ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

    const textResponse = await aiClient.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: mainPrompt }] }],
      config: {
        systemInstruction,
        tools,
        toolConfig
      }
    });

    const jsonExtractionPrompt = `
      Extract domain-specific analysis data for "${url}" from the following report.
      
      REPORT: "${textResponse.text}"
      
      JSON FORMAT:
      {
        "current": { "seo": int, "performance": int, "accessibility": int, "bestPractices": int, "aeoReadiness": int },
        "target": { "seo": int, "performance": int, "accessibility": int, "bestPractices": int, "aeoReadiness": int },
        "theDifference": "Analysis summary",
        "findings": ["Discovery 1", "..."],
        "competitors": [
           { "name": "string", "url": "string", "advantage": "string", "gap": "string" }
        ],
        "keywords": [
           { "term": "string", "intent": "Transactional|Informational|Navigational", "volume": "string", "difficulty": "string" }
        ],
        "metadata": { 
           "channelExists": boolean, 
           "channelLink": "string", 
           "reviewSources": [{"source": "name", "count": int, "rating": float}] 
        }
      }
    `;

    const comparisonResponse = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: jsonExtractionPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.OBJECT, properties: { seo: { type: Type.INTEGER }, performance: { type: Type.INTEGER }, accessibility: { type: Type.INTEGER }, bestPractices: { type: Type.INTEGER }, aeoReadiness: { type: Type.INTEGER } } },
            target: { type: Type.OBJECT, properties: { seo: { type: Type.INTEGER }, performance: { type: Type.INTEGER }, accessibility: { type: Type.INTEGER }, bestPractices: { type: Type.INTEGER }, aeoReadiness: { type: Type.INTEGER } } },
            theDifference: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  intent: { type: Type.STRING },
                  volume: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["term", "intent"]
              }
            },
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, url: { type: Type.STRING }, advantage: { type: Type.STRING }, gap: { type: Type.STRING } }
              }
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                channelExists: { type: Type.BOOLEAN },
                channelLink: { type: Type.STRING },
                reviewSources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, count: { type: Type.INTEGER }, rating: { type: Type.NUMBER } } } }
              }
            }
          },
          required: ["keywords", "competitors", "findings", "theDifference"]
        }
      }
    });

    let structuredData;
    try {
      structuredData = JSON.parse(comparisonResponse.text);
    } catch (e) {
      structuredData = { 
        current: { seo: 50, performance: 50, accessibility: 50, bestPractices: 50, aeoReadiness: 50 },
        target: { seo: 95, performance: 95, accessibility: 95, bestPractices: 95, aeoReadiness: 95 },
        theDifference: "Data extracted with fallback formatting.",
        findings: ["Review the Strategy Plan for full details."],
        competitors: [],
        keywords: []
      };
    }

    const urls = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => {
      if (chunk.web) return { title: chunk.web.title, uri: chunk.web.uri };
      if (chunk.maps) return { title: chunk.maps.title, uri: chunk.maps.uri };
      return null;
    }).filter(Boolean) || [];

    const finalResponse: AIResponse = {
      text: textResponse.text || "Analysis failed.",
      comparison: { 
        current: structuredData.current || { seo: 50, performance: 50, accessibility: 50, bestPractices: 50, aeoReadiness: 50 }, 
        target: structuredData.target || { seo: 95, performance: 95, accessibility: 95, bestPractices: 95, aeoReadiness: 95 }
      },
      theDifference: structuredData.theDifference,
      findings: structuredData.findings || [],
      competitors: structuredData.competitors || [],
      keywords: structuredData.keywords || [],
      urls,
      metadata: structuredData.metadata
    };

    localStorage.setItem(cacheKey, JSON.stringify(finalResponse));
    return finalResponse;
  }
}

export const gemini = new GeminiService();
