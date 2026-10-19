import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Briefcase,
  GraduationCap,
  Layers,
  FileSearch,
  Scale,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import { MatchReportResponse } from '../types/match';
import { createMatchReport } from '../services/matchService';
import { ScoreRing, Badge } from './ui';
import { SemanticEvidenceExplorer } from './SemanticEvidenceExplorer';

interface Props {
  report: MatchReportResponse;
  resumeFilename?: string;
  jobTitle?: string;
  onClose: () => void;
  onReportUpdated?: (updated: MatchReportResponse) => void;
}

export const MatchReportModal: React.FC<Props> = ({
  report,
  resumeFilename,
  jobTitle,
  onClose,
  onReportUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    'required' | 'preferred' | 'experience' | 'semantic' | 'disclosures'
  >('required');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeEvidence, setActiveEvidence] = useState<{
    skillName: string;
    jobText?: string;
    jobOffset?: string;
    resumeText?: string;
    resumeOffset?: string;
    explanation: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await createMatchReport(report.resume_id, report.job_id, true);
      if (onReportUpdated) onReportUpdated(refreshed);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const requiredMatched = report.matched_skills.filter((s) => s.requirement_level === 'required');
  const requiredMissing = report.missing_skills.filter((s) => s.requirement_level === 'required');

  const preferredMatched = report.matched_skills.filter((s) => s.requirement_level === 'preferred');
  const preferredMissing = report.missing_skills.filter((s) => s.requirement_level === 'preferred');

  const ambiguousMatched = report.matched_skills.filter((s) => s.requirement_level === 'ambiguous');
  const ambiguousMissing = report.missing_skills.filter((s) => s.requirement_level === 'ambiguous');
  const verifiedMissing = report.missing_skills.filter(
    (s) => s.requirement_level !== 'ambiguous' && s.status !== 'ambiguous_requirement'
  );

  const bd = report.score_breakdown;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-modal flex flex-col max-h-[92vh] overflow-hidden text-slate-100 my-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0d1117]/70">
          <div className="flex items-center gap-4">
            <ScoreRing
              score={report.overall_score}
              size="md"
              label="QI"
              provisional={report.is_provisional}
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-100">
                  Qualification Index: {report.overall_score}%
                </h3>
                {report.is_provisional ? (
                  <Badge variant="amber" icon={<AlertTriangle className="h-3 w-3" />}>
                    Provisional Match
                  </Badge>
                ) : (
                  <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
                    Verified Evidence
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing Candidate &ldquo;{resumeFilename || report.resume_id.slice(0, 8)}&rdquo; against Job &ldquo;{jobTitle || report.job_id.slice(0, 8)}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors disabled:opacity-50"
              title="Recompute match report"
              id="recompute-match-btn"
            >
              <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
              aria-label="Close match modal"
              id="close-match-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Score Breakdown Cards Grid */}
        <div className="px-6 py-3.5 bg-[#0d1117]/40 border-b border-[#21262d] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Mandatory Skills</div>
            <div className="text-xl font-bold text-slate-100">{bd.required_skills_score}%</div>
            <div className="text-[10px] text-brand-400 font-mono">Weight: {(bd.required_skills_weight * 100).toFixed(0)}%</div>
          </div>
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Preferred Skills</div>
            <div className="text-xl font-bold text-slate-100">{bd.preferred_skills_score}%</div>
            <div className="text-[10px] text-brand-400 font-mono">Weight: {(bd.preferred_skills_weight * 100).toFixed(0)}%</div>
          </div>
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Work Experience</div>
            <div className="text-xl font-bold text-slate-100">
              {bd.experience_score !== null && bd.experience_score !== undefined ? `${bd.experience_score}%` : 'Unscored'}
            </div>
            <div className="text-[10px] text-brand-400 font-mono">
              {bd.experience_weight > 0 ? `Weight: ${(bd.experience_weight * 100).toFixed(0)}%` : 'No penalty'}
            </div>
          </div>
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Education Level</div>
            <div className="text-xl font-bold text-slate-100">
              {bd.education_score !== null && bd.education_score !== undefined ? `${bd.education_score}%` : 'Unscored'}
            </div>
            <div className="text-[10px] text-brand-400 font-mono">
              {bd.education_weight > 0 ? `Weight: ${(bd.education_weight * 100).toFixed(0)}%` : 'No penalty'}
            </div>
          </div>
        </div>

        {/* Provisional Disclosures Banner */}
        {report.is_provisional && report.provisional_reasons.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Provisional Evaluation Reason</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-200/90 text-[11px]">
              {report.provisional_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Ambiguous Requirements Banner */}
        {(ambiguousMatched.length > 0 || ambiguousMissing.length > 0) && (
          <div className="mx-6 mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Ambiguous Requirements ({ambiguousMatched.length + ambiguousMissing.length}) — Excluded from Scoring</span>
            </div>
            <p className="text-amber-200/80 text-[11px] leading-relaxed">
              The following terms appeared without sufficient language or tooling context in the job description. They are excluded from verified scoring and missing-competency search to avoid unfairly penalizing candidates:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[...ambiguousMatched, ...ambiguousMissing].map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-[#21262d] border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-1.5"
                >
                  <span className="font-bold">{s.skill_name}</span>
                  <span className="text-[10px] text-amber-300/70">
                    ({s.status === 'exact_match' || s.status === 'related_skill' ? 'Matched in Profile' : 'Unconfirmed in Profile'})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#21262d] px-6 mt-3 gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('required')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'required'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Mandatory Requirements ({requiredMatched.length}/{requiredMatched.length + requiredMissing.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('preferred')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preferred'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Preferred Qualifications ({preferredMatched.length}/{preferredMatched.length + preferredMissing.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('experience')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'experience'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Experience & Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('semantic')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'semantic'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-semantic-evidence"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Semantic Evidence Explorer</span>
            {verifiedMissing.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {verifiedMissing.length} gaps
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('disclosures')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'disclosures'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span>Scoring Methodology & Ethics</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: REQUIRED / MANDATORY */}
          {activeTab === 'required' && (
            <div className="space-y-6">
              {/* Matched mandatory skills */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Verified Mandatory Skills ({requiredMatched.length})
                </h4>
                {requiredMatched.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No mandatory skills verified in profile text.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requiredMatched.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-slate-300 border border-[#30363d]">
                              {item.category || 'skill'}
                            </span>
                            {item.status === 'related_skill' ? (
                              <Badge variant="amber">Related</Badge>
                            ) : (
                              <Badge variant="teal">Exact Match</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{item.explanation}</p>
                        </div>

                        {(item.job_source || item.resume_source) && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} – ${item.job_source?.char_end ?? '?'}`,
                                resumeText: item.resume_source?.source_text,
                                resumeOffset: `${item.resume_source?.char_start ?? '?'} – ${item.resume_source?.char_end ?? '?'}`,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-brand-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors shrink-0"
                            title="Inspect dual source evidence spans"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing mandatory skills */}
              <div className="pt-4 border-t border-[#21262d]">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Unverified Evidence in Resume ({requiredMissing.length})
                </h4>
                {requiredMissing.length === 0 ? (
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete coverage! All mandatory requirements have verified candidate evidence.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requiredMissing.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#0d1117]/60 border border-[#21262d] rounded-xl flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-300 text-xs">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-slate-400 border border-[#30363d]">
                              {item.category || 'skill'}
                            </span>
                            <Badge variant="muted">No Evidence</Badge>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.explanation}</p>
                        </div>

                        {item.job_source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} – ${item.job_source?.char_end ?? '?'}`,
                                resumeText: undefined,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors shrink-0"
                            title="Inspect job requirement evidence"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PREFERRED / NICE-TO-HAVE */}
          {activeTab === 'preferred' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                  Preferred Qualifications Matched ({preferredMatched.length})
                </h4>
                {preferredMatched.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No preferred qualifications verified in profile text.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preferredMatched.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-slate-300 border border-[#30363d]">
                              {item.category || 'skill'}
                            </span>
                            <Badge variant="brand">Bonus Match</Badge>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{item.explanation}</p>
                        </div>

                        {(item.job_source || item.resume_source) && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} – ${item.job_source?.char_end ?? '?'}`,
                                resumeText: item.resume_source?.source_text,
                                resumeOffset: `${item.resume_source?.char_start ?? '?'} – ${item.resume_source?.char_end ?? '?'}`,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-brand-400 hover:text-white rounded-lg transition-colors shrink-0"
                            title="Inspect evidence spans"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#21262d]">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Preferred Qualifications Not Mentioned ({preferredMissing.length})
                </h4>
                {preferredMissing.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No remaining preferred qualifications.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preferredMissing.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#0d1117]/60 border border-[#21262d] rounded-xl flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-300 text-xs">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-slate-400 border border-[#30363d]">
                              {item.category || 'skill'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPERIENCE & CREDENTIALS */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {/* Experience comparison card */}
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-brand-400" />
                    <h4 className="font-bold text-slate-100 text-xs">Work Experience Duration</h4>
                  </div>
                  <Badge
                    variant={
                      report.experience_comparison.status === 'met'
                        ? 'teal'
                        : report.experience_comparison.status === 'partial'
                        ? 'amber'
                        : 'muted'
                    }
                  >
                    {report.experience_comparison.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Target Role Requirement:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.experience_comparison.required_years !== null && report.experience_comparison.required_years !== undefined
                        ? `${report.experience_comparison.required_years}+ years`
                        : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Candidate Tenure Detected:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.experience_comparison.candidate_years !== null && report.experience_comparison.candidate_years !== undefined
                        ? `~${report.experience_comparison.candidate_years} years`
                        : 'Insufficient dates in resume'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{report.experience_comparison.explanation}</p>
              </div>

              {/* Education comparison card */}
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-brand-400" />
                    <h4 className="font-bold text-slate-100 text-xs">Education & Academic Credentials</h4>
                  </div>
                  <Badge
                    variant={
                      report.education_comparison.status === 'met'
                        ? 'teal'
                        : report.education_comparison.status === 'partial'
                        ? 'amber'
                        : 'muted'
                    }
                  >
                    {report.education_comparison.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Required Level:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.education_comparison.required_level || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Candidate Extracted:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.education_comparison.candidate_level || 'No degree listed'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{report.education_comparison.explanation}</p>
              </div>
            </div>
          )}

          {/* TAB 4: DISCLOSURES & METHODOLOGY */}
          {activeTab === 'disclosures' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-brand-400" />
                  Deterministic Formula & Weight Composition
                </h4>
                <p className="text-slate-400">
                  ApplyGraph calculates an <strong>Evidence-Grounded Qualification Index</strong> (0–100 scale). It is strictly a measure of verified requirement coverage, computed through deterministic mathematical weights:
                </p>
                <div className="p-3 bg-[#161b22] font-mono text-[11px] rounded-lg border border-[#30363d] text-brand-300">
                  Overall Score = (0.60 * Mandatory) + (0.20 * Preferred) + (0.10 * Experience) + (0.10 * Education)
                </div>
                <p className="text-slate-400 text-[11px]">
                  Weights dynamically adjust when dimensions lack explicit requirements so candidates are never penalized for unrequested information.
                </p>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  Important Scientific & Ethical Disclaimers
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>
                    <strong className="text-slate-200">Not a hiring probability:</strong> This score does not predict hiring decisions, candidate aptitude, or future interview performance.
                  </li>
                  <li>
                    <strong className="text-slate-200">Evidence vs competence:</strong> An unverified requirement indicates that no explicit mention was found in the submitted document text. It does NOT constitute proof of candidate incompetence.
                  </li>
                  <li>
                    <strong className="text-slate-200">Deterministic proof:</strong> Keyword presence alone is treated as mention evidence, not certified expert proficiency.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: SEMANTIC EVIDENCE EXPLORER */}
          {activeTab === 'semantic' && (
            <div className="space-y-4">
              <SemanticEvidenceExplorer
                matchId={report.id}
                missingSkills={verifiedMissing.map((s) => ({
                  skill_name: s.skill_name,
                  requirement_level: s.requirement_level,
                }))}
              />
            </div>
          )}
        </div>

        {/* Dual-Evidence Inspector Popover Drawer */}
        {activeEvidence && (
          <div className="px-6 py-4 bg-[#0d1117] border-t border-[#30363d] flex flex-col space-y-3 text-xs animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-xs flex items-center gap-2">
                <Info className="h-4 w-4 text-brand-400" />
                <span>Dual Evidence Provenance: {activeEvidence.skillName}</span>
              </span>
              <button
                onClick={() => setActiveEvidence(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                aria-label="Close evidence inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5 border-l-2 border-l-brand-500">
                <div className="flex items-center justify-between text-[11px] text-brand-300 font-semibold">
                  <span>Job Posting Verbatim Span</span>
                  {activeEvidence.jobOffset && (
                    <span className="font-mono text-[10px] text-slate-400">Chars: {activeEvidence.jobOffset}</span>
                  )}
                </div>
                <blockquote className="font-mono text-slate-200 text-xs leading-relaxed">
                  {activeEvidence.jobText ? `"${activeEvidence.jobText}"` : 'No exact snippet span'}
                </blockquote>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5 border-l-2 border-l-teal-500">
                <div className="flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                  <span>Candidate Resume Verbatim Span</span>
                  {activeEvidence.resumeOffset && (
                    <span className="font-mono text-[10px] text-slate-400">Chars: {activeEvidence.resumeOffset}</span>
                  )}
                </div>
                <blockquote className="font-mono text-slate-200 text-xs leading-relaxed">
                  {activeEvidence.resumeText ? `"${activeEvidence.resumeText}"` : 'No verified mention found in candidate resume text'}
                </blockquote>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
