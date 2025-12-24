
import React, { useState, useEffect } from 'react';
import { MarketingPillar, AIResponse, AuditScores, CompetitorData, KeywordData } from './types';
import { PILLARS } from './constants';
import { gemini } from './services/geminiService';
import { jsPDF } from 'jspdf';

const ScoreGauge: React.FC<{ label: string; current: number; target: number; color: string }> = ({ label, current, target, color }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const currentOffset = circumference - (current / 100) * circumference;
  const targetOffset = circumference - (target / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 group p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
          <circle
            cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: currentOffset }}
            className={`${color} opacity-30`}
          />
          <circle
            cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: targetOffset, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            className={`${color} drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 line-through decoration-slate-400/50">{current}</span>
          <span className="text-xl font-black leading-none">{target}</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400 group-hover:text-white transition-colors text-center">
        {label}
      </span>
      <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black">
        +{target - current}%
      </div>
    </div>
  );
};

const CompetitorCard: React.FC<{ competitor: CompetitorData }> = ({ competitor }) => (
  <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group shadow-xl">
    <div className="flex items-center justify-between mb-4">
      <h5 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors truncate pr-2">
        {competitor.name}
      </h5>
      <span className="text-[8px] font-black px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full uppercase">Rival</span>
    </div>
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Advantage</p>
        <p className="text-xs text-slate-300 leading-relaxed">{competitor.advantage}</p>
      </div>
      <div className="pt-3 border-t border-white/5">
        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">How to Beat</p>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">{competitor.gap}</p>
      </div>
    </div>
  </div>
);

const KeywordTag: React.FC<{ keyword: KeywordData }> = ({ keyword }) => {
  const getIntentColor = (intent: string) => {
    switch (intent.toLowerCase()) {
      case 'transactional': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'informational': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'navigational': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  return (
    <div className={`px-4 py-2 rounded-xl border text-[11px] font-bold flex flex-col gap-1 transition-all hover:scale-105 ${getIntentColor(keyword.intent)}`}>
      <span className="flex justify-between items-center gap-4">
        {keyword.term}
        <span className="text-[8px] opacity-60 uppercase font-black">{keyword.intent}</span>
      </span>
      {(keyword.volume || keyword.difficulty) && (
        <div className="flex gap-2 text-[8px] font-black opacity-50 border-t border-current/10 pt-1">
          {keyword.volume && <span>Vol: {keyword.volume}</span>}
          {keyword.difficulty && <span>Diff: {keyword.difficulty}</span>}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<MarketingPillar>(MarketingPillar.SEO);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterProgress, setMasterProgress] = useState(0);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'difference' | 'roadmap'>('difference');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        setHasApiKey(false);
      }
    };
    checkApiKey();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => console.log('Location access denied.'));
    }
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const currentPillar = PILLARS.find(p => p.id === selectedPillar)!;

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await gemini.analyzeStrategy(selectedPillar, url, location || undefined);
      setResult(response);
      setActiveTab('difference');
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes("Requested entity was not found")) {
        await handleSelectKey();
      } else {
        setResult({ text: "Error encountered.", findings: ["Connection failed."], theDifference: "Service error." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFullReport = async () => {
    if (!url) return;
    setMasterLoading(true);
    setMasterProgress(0);
    const results: Record<string, AIResponse> = {};
    try {
      for (let i = 0; i < PILLARS.length; i++) {
        const pillar = PILLARS[i];
        setMasterProgress(Math.round(((i) / PILLARS.length) * 100));
        const res = await gemini.analyzeStrategy(pillar.id, url, location || undefined);
        results[pillar.id] = res;
      }
      setMasterProgress(100);

      const doc = new jsPDF();
      const margin = 20;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text('GROWTHSTACK', margin, 80);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('FORENSIC DOMAIN AUDIT', margin, 95);

      PILLARS.forEach((pillar) => {
        doc.addPage();
        const data = results[pillar.id];
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(pillar.title.toUpperCase(), margin, 30);
        doc.setFontSize(12);
        doc.text('KEYWORDS', margin, 65);
        let keyY = 75;
        data.keywords?.slice(0, 5).forEach(k => {
          doc.text(`- ${k.term} (${k.intent})`, margin + 5, keyY);
          keyY += 7;
        });
        doc.setFontSize(12);
        doc.text('STRATEGY', margin, keyY + 10);
        const textLines = doc.splitTextToSize(data.text, 170);
        doc.setFontSize(9);
        doc.text(textLines, margin, keyY + 20);
      });

      doc.save(`GrowthStack_KeywordsAudit_${url.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error: any) {
      console.error("PDF Export failed", error);
    } finally {
      setMasterLoading(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full glass-effect rounded-3xl p-10 text-center border border-white/10 space-y-8 shadow-2xl">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <i className="fa-solid fa-key text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Audit Access</h1>
          <button onClick={handleSelectKey} className="w-full py-4 bg-white text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-xl">
            Authorize & Launch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      {/* Master Loading Overlay */}
      {masterLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl">
          <div className="w-72 h-3 bg-white/5 rounded-full overflow-hidden mb-8 border border-white/10">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-700" style={{ width: `${masterProgress}%` }} />
          </div>
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Competitive Keyword Scan</h2>
          <p className="text-slate-500 text-sm mt-3 uppercase tracking-widest font-bold">{masterProgress}% Analyzing Search Landscape</p>
        </div>
      )}

      <header className="border-b border-white/5 p-6 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20">
            <i className="fa-solid fa-tower-broadcast text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">GrowthStack <span className="text-blue-500">Forensics</span></h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black">AI Keyword & Audit Platform</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex gap-1.5 p-1 bg-white/5 rounded-full overflow-x-auto max-w-full scrollbar-hide border border-white/5">
            {PILLARS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p.id)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                  selectedPillar === p.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="p-8 rounded-3xl glass-effect border-l-8 border-blue-500 shadow-2xl">
            <h2 className="text-2xl font-black mb-1 flex items-center gap-3">
              <i className={`${currentPillar.icon} text-blue-500`}></i>
              {currentPillar.title} Scan
            </h2>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed font-medium uppercase tracking-wider">{currentPillar.objective}</p>
          </div>

          <div className="p-8 rounded-3xl glass-effect border border-white/5 space-y-10 shadow-2xl">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Target Domain</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-5 px-6 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 text-white font-bold outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={handleAnalyze}
                disabled={loading || !url}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all ${
                  loading || !url ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/40'
                }`}
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin text-lg"></i> : <i className="fa-solid fa-crosshairs text-lg"></i>}
                Perform Site Audit
              </button>
              {url && (
                <button
                  onClick={handleDownloadFullReport}
                  className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  Keyword Landscape PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="flex bg-white/5 p-1.5 rounded-2xl w-fit border border-white/5 shadow-xl">
            <button 
              onClick={() => setActiveTab('difference')}
              className={`px-8 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeTab === 'difference' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Direct Findings
            </button>
            <button 
              onClick={() => setActiveTab('roadmap')}
              className={`px-8 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Strategic Roadmap
            </button>
          </div>

          <div className="flex-1 rounded-[2.5rem] glass-effect p-10 min-h-[650px] border border-white/5 flex flex-col shadow-2xl relative">
            {!result && !loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <i className="fa-solid fa-magnifying-glass text-5xl text-slate-800 mb-10 animate-pulse"></i>
                <h3 className="text-3xl font-black tracking-tight mb-4">Awaiting Website...</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Enter a domain to initiate a site-wide keyword audit and competitive landscape analysis.</p>
              </div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="w-32 h-32 rounded-full border-t-4 border-blue-500 animate-spin" />
                <p className="text-2xl font-black text-blue-400 tracking-tight">Mining Website Keywords...</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-1000 flex flex-col flex-1">
                {activeTab === 'difference' ? (
                  <div className="space-y-12">
                    {/* Competitive Summary */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 rounded-[2rem] p-8 border border-blue-500/20 shadow-xl relative overflow-hidden group">
                        <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-400 mb-4">Forensic Impact Summary</h4>
                        <p className="text-xl font-bold text-white leading-relaxed italic">"{result.theDifference}"</p>
                    </div>

                    {/* Keyword Landscape */}
                    {result.keywords && result.keywords.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-3 tracking-[0.2em]">
                          <i className="fa-solid fa-key text-amber-500"></i> Website Keyword Landscape
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {result.keywords.map((kw, idx) => (
                            <KeywordTag key={idx} keyword={kw} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Battle Cards (Competitors) */}
                    {result.competitors && result.competitors.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-3 tracking-[0.2em]">
                          <i className="fa-solid fa-shield-virus text-red-500"></i> Industry Rivals Detected
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {result.competitors.map((comp, idx) => (
                            <CompetitorCard key={idx} competitor={comp} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Forensic Discoveries */}
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-3 tracking-[0.2em]">
                        <i className="fa-solid fa-list-check text-blue-500"></i> Forensic Discoveries
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.findings.map((finding, idx) => (
                          <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-black shrink-0">{idx + 1}</span>
                            <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors pt-1.5">{finding}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vital Gauges */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {result.comparison && (
                        <>
                          <ScoreGauge label="SEO" current={result.comparison.current.seo} target={result.comparison.target.seo} color="text-emerald-500" />
                          <ScoreGauge label="Performance" current={result.comparison.current.performance} target={result.comparison.target.performance} color="text-amber-500" />
                          <ScoreGauge label="Accessibility" current={result.comparison.current.accessibility} target={result.comparison.target.accessibility} color="text-blue-500" />
                          <ScoreGauge label="Best Practices" current={result.comparison.current.bestPractices} target={result.comparison.target.bestPractices} color="text-indigo-500" />
                          <ScoreGauge label="AEO Readiness" current={result.comparison.current.aeoReadiness} target={result.comparison.target.aeoReadiness} color="text-purple-500" />
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-3xl font-black text-white tracking-tight mb-10 border-b border-white/5 pb-8">Strategic Execution Plan</h3>
                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-medium text-base first-letter:text-5xl first-letter:font-black first-letter:text-blue-500 first-letter:mr-3 first-letter:float-left">
                      {result.text}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
