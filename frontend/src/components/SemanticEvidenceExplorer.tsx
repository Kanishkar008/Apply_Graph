import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  FileText,
  Info,
  RefreshCw,
} from 'lucide-react';
import { fetchSemanticEvidence } from '../services/semanticService';
import {
  SemanticEvidenceResponse,
  SemanticReviewState,
} from '../types/semantic';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface SemanticEvidenceExplorerProps {
  matchId: string;
  missingSkills?: Array<{ skill_name: string; requirement_level?: string }>;
}

export const SemanticEvidenceExplorer: React.FC<SemanticEvidenceExplorerProps> = ({
  matchId,
  missingSkills = [],
}) => {
  const [queryText, setQueryText] = useState<string>(
    missingSkills.length > 0 ? missingSkills[0].skill_name : ''
  );
  const [topK, setTopK] = useState<number>(5);
  const [minSimilarity, setMinSimilarity] = useState<number>(0.25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; isModelMissing?: boolean } | null>(null);
  const [result, setResult] = useState<SemanticEvidenceResponse | null>(null);

  // Transient human review state keyed by passage start offset or index
  const [reviewStates, setReviewStates] = useState<Record<number, SemanticReviewState>>({});

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    setIsLoading(true);
    setError(null);
    setReviewStates({});

    try {
      const data = await fetchSemanticEvidence(matchId, {
        requirement_text: cleanQuery,
        top_k: topK,
        min_similarity: minSimilarity,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query semantic evidence';
      const is503 = msg.includes('503') || msg.toLowerCase().includes('model is not installed');
      setError({
        message: msg,
        isModelMissing: is503,
      });
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetReview = (index: number, state: SemanticReviewState) => {
    setReviewStates((prev) => ({
      ...prev,
      [index]: state,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search & Configuration Header */}
      <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Semantic Evidence Retrieval
                <Badge variant="brand">Local all-MiniLM-L6-v2</Badge>
              </h4>
              <p className="text-xs text-slate-400">
                Search candidate resume text for experience passages semantically relevant to requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Missing Skills Quick-Pills */}
        {missingSkills.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Quick-Search Missing Competencies:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((skill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQueryText(skill.skill_name);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                    queryText === skill.skill_name
                      ? 'bg-brand-500/15 text-brand-300 border-brand-500/40 shadow-sm'
                      : 'bg-[#21262d] text-slate-300 border-[#30363d] hover:bg-[#30363d] hover:text-white'
                  }`}
                >
                  <span>{skill.skill_name}</span>
                  {skill.requirement_level && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({skill.requirement_level})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-3 pt-2 border-t border-[#21262d]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Enter job requirement or skill (e.g., 'Deploy and manage Kubernetes clusters')..."
                className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                disabled={isLoading}
                id="semantic-query-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
                <span className="text-slate-400 text-[11px]">Top:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
                  disabled={isLoading}
                  id="semantic-topk-select"
                >
                  <option value={3} className="bg-[#161b22]">3</option>
                  <option value={5} className="bg-[#161b22]">5</option>
                  <option value={10} className="bg-[#161b22]">10</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
                <span className="text-slate-400 text-[11px]">Min Sim:</span>
                <select
                  value={minSimilarity}
                  onChange={(e) => setMinSimilarity(Number(e.target.value))}
                  className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
                  disabled={isLoading}
                  id="semantic-minsim-select"
                >
                  <option value={0.15} className="bg-[#161b22]">0.15 (Broad)</option>
                  <option value={0.25} className="bg-[#161b22]">0.25 (Default)</option>
                  <option value={0.4} className="bg-[#161b22]">0.40 (High)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading || !queryText.trim()}
                icon={isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                id="run-semantic-search-btn"
              >
                {isLoading ? 'Searching...' : 'Find Evidence'}
              </Button>
            </div>
          </div>
        </form>

        {/* Methodology & Ethics Advisory */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-brand-950/20 border border-brand-800/30 text-[11px] text-brand-300/90 leading-relaxed">
          <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <strong>Semantic Retrieval Disclaimer:</strong> Cosine similarity measures vector alignment between your query and resume passages. It is an auxiliary retrieval tool and does <strong>not</strong> represent a probability of qualification or hiring success.
          </span>
        </div>
      </div>

      {/* State Displays */}
      {/* 1. Error Display */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl space-y-2 text-xs text-red-300 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>
              {error.isModelMissing
                ? 'Semantic Engine Offline / Model Unavailable'
                : 'Semantic Retrieval Failed'}
            </span>
          </div>
          <p className="text-[11px] text-red-200/80 leading-relaxed">
            {error.message}
          </p>
          {error.isModelMissing && (
            <p className="text-[11px] text-slate-400 pt-1 border-t border-red-900/30">
              Please verify that the <code>models_cache/all-MiniLM-L6-v2</code> snapshot is installed on the backend server.
            </p>
          )}
        </div>
      )}

      {/* 2. Loading State */}
      {isLoading && (
        <div className="p-10 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          <div className="text-center space-y-0.5">
            <p className="text-xs font-semibold text-slate-200">Analyzing Resume Passages with MiniLM...</p>
            <p className="text-[11px] text-slate-400">Computing 384-dimensional cosine similarities offline</p>
          </div>
        </div>
      )}

      {/* 3. Empty Results State */}
      {!isLoading && !error && result && result.candidates.length === 0 && (
        <div className="p-8 bg-[#161b22] border border-[#30363d] rounded-xl text-center space-y-2 text-slate-400">
          <FileText className="h-8 w-8 text-slate-400 mx-auto opacity-50" />
          <p className="text-xs font-semibold text-slate-300">No Semantic Evidence Found Above Cutoff</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Evaluated {result.total_passages_evaluated} passages in candidate resume against &ldquo;{result.requirement_text}&rdquo;, but none exceeded similarity threshold {result.min_similarity_threshold}.
          </p>
          <button
            type="button"
            onClick={() => {
              setMinSimilarity(0.15);
              handleSearch();
            }}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 mt-2"
          >
            <RefreshCw className="h-3 w-3" /> Retry with Lower Cutoff (0.15)
          </button>
        </div>
      )}

      {/* 4. Results List with Exact Spans and Transient Review Actions */}
      {!isLoading && !error && result && result.candidates.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Found <strong className="text-slate-200">{result.candidates.length}</strong> relevant passages (from {result.total_passages_evaluated} evaluated):
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Cutoff: {result.min_similarity_threshold}
            </span>
          </div>

          <div className="space-y-3">
            {result.candidates.map((cand, idx) => {
              const currentReview = reviewStates[idx] || cand.review_state;
              const hasNegation = cand.diagnostic_flag === 'potential_negation';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    currentReview === 'confirmed'
                      ? 'bg-teal-950/20 border-teal-800/40'
                      : currentReview === 'rejected'
                      ? 'bg-red-950/15 border-red-800/30 opacity-75'
                      : currentReview === 'uncertain'
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-[#161b22] border-[#30363d]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400 bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        Rank #{idx + 1}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          cand.similarity_score >= 0.65
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : cand.similarity_score >= 0.45
                            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        Similarity: {cand.similarity_score.toFixed(4)}
                      </span>

                      {hasNegation && (
                        <Badge variant="amber" icon={<AlertTriangle className="h-3 w-3" />}>
                          Potential Negation Detected
                        </Badge>
                      )}

                      {/* Current Review State Badge */}
                      {currentReview === 'confirmed' && (
                        <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
                          Human Confirmed
                        </Badge>
                      )}
                      {currentReview === 'rejected' && (
                        <Badge variant="rose" icon={<XCircle className="h-3 w-3" />}>
                          Human Rejected
                        </Badge>
                      )}
                      {currentReview === 'uncertain' && (
                        <Badge variant="amber" icon={<HelpCircle className="h-3 w-3" />}>
                          Uncertain / Probe in Interview
                        </Badge>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 text-right shrink-0">
                      Offsets: [{cand.source_span.char_start} : {cand.source_span.char_end}]
                    </div>
                  </div>

                  {/* Verbatim Excerpt */}
                  <blockquote className="p-3 bg-[#0d1117] border border-[#21262d] rounded-lg text-xs text-slate-200 leading-relaxed font-sans mb-3 italic">
                    &ldquo;{cand.passage_text}&rdquo;
                  </blockquote>

                  {/* Diagnostic Warning if Negation Phrase Detected */}
                  {hasNegation && (
                    <div className="p-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>
                        <strong>Counter-Evidence Warning:</strong> This passage contains phrases indicating absence or limitation of experience. Review carefully before accepting.
                      </span>
                    </div>
                  )}

                  {/* Human Transient Review Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[#21262d] text-xs">
                    <span className="text-[11px] text-slate-400">
                      Human Review Decision (Transient):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetReview(idx, 'confirmed')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                          currentReview === 'confirmed'
                            ? 'bg-teal-600 text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white'
                        }`}
                        title="Confirm that candidate has this experience"
                      >
                        <CheckCircle2 className="h-3 w-3 text-teal-400" /> Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetReview(idx, 'uncertain')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                          currentReview === 'uncertain'
                            ? 'bg-amber-600 text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white'
                        }`}
                        title="Mark for interview follow-up"
                      >
                        <HelpCircle className="h-3 w-3 text-amber-400" /> Uncertain
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetReview(idx, 'rejected')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                          currentReview === 'rejected'
                            ? 'bg-red-600 text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white'
                        }`}
                        title="Reject irrelevant or superficial match"
                      >
                        <XCircle className="h-3 w-3 text-red-400" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
