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
} from 'lucide-react';
import { MatchReportResponse } from '../types/match';
import { createMatchReport } from '../services/matchService';

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
  const [activeTab, setActiveTab] = useState<'required' | 'preferred' | 'experience' | 'disclosures'>('required');
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

  const requiredMatched = report.matched_skills.filter((s) => s.requirement_level !== 'preferred');
  const requiredMissing = report.missing_skills.filter((s) => s.requirement_level !== 'preferred');

  const preferredMatched = report.matched_skills.filter((s) => s.requirement_level === 'preferred');
  const preferredMissing = report.missing_skills.filter((s) => s.requirement_level === 'preferred');

  const bd = report.score_breakdown;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-slate-100">Qualification Index: {report.overall_score}%</h3>
                {report.is_provisional ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    Provisional Match
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Verified Evidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing Candidate &ldquo;{resumeFilename || report.resume_id.slice(0, 8)}&rdquo; against Job &ldquo;{jobTitle || report.job_id.slice(0, 8)}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Recompute match report"
              id="recompute-match-btn"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close match modal"
              id="close-match-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Score Breakdown Cards */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">Mandatory Skills</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{bd.required_skills_score}%</div>
            <div className="text-[10px] text-indigo-400">Weight: {(bd.required_skills_weight * 100).toFixed(0)}%</div>
          </div>
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">Preferred Skills</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{bd.preferred_skills_score}%</div>
            <div className="text-[10px] text-indigo-400">Weight: {(bd.preferred_skills_weight * 100).toFixed(0)}%</div>
          </div>
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">Work Experience</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">
              {bd.experience_score !== null && bd.experience_score !== undefined ? `${bd.experience_score}%` : 'Unscored'}
            </div>
            <div className="text-[10px] text-indigo-400">
              {bd.experience_weight > 0 ? `Weight: ${(bd.experience_weight * 100).toFixed(0)}%` : 'No penalty'}
            </div>
          </div>
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">Education Credentials</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">
              {bd.education_score !== null && bd.education_score !== undefined ? `${bd.education_score}%` : 'Unscored'}
            </div>
            <div className="text-[10px] text-indigo-400">
              {bd.education_weight > 0 ? `Weight: ${(bd.education_weight * 100).toFixed(0)}%` : 'No penalty'}
            </div>
          </div>
        </div>

        {/* Provisional Disclosures Banner */}
        {report.is_provisional && report.provisional_reasons.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Provisional Match Disclosures</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-300/90">
              {report.provisional_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 mt-3 space-x-4">
          <button
            onClick={() => setActiveTab('required')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'required'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mandatory Skills ({requiredMatched.length}/{requiredMatched.length + requiredMissing.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('preferred')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'preferred'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Preferred Skills ({preferredMatched.length}/{preferredMatched.length + preferredMissing.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('experience')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'experience'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Experience & Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('disclosures')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'disclosures'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Explainability & Methodology</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: REQUIRED SKILLS */}
          {activeTab === 'required' && (
            <div className="space-y-6">
              {/* Matched mandatory skills */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                  Verified Mandatory Skills ({requiredMatched.length})
                </h4>
                {requiredMatched.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No mandatory skills verified in profile.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requiredMatched.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-100 text-sm">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                              {item.category || 'skill'}
                            </span>
                            {item.status === 'related_skill' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
                                Related skill
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                                Exact match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{item.explanation}</p>
                        </div>

                        {(item.job_source || item.resume_source) && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} - ${item.job_source?.char_end ?? '?'}`,
                                resumeText: item.resume_source?.source_text,
                                resumeOffset: `${item.resume_source?.char_start ?? '?'} - ${item.resume_source?.char_end ?? '?'}`,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-slate-700/50 rounded"
                            title="Inspect dual source evidence spans"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing mandatory skills */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                  Unverified Evidence ({requiredMissing.length})
                </h4>
                {requiredMissing.length === 0 ? (
                  <p className="text-sm text-emerald-400 font-medium">All mandatory requirements have verified candidate evidence!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requiredMissing.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/30 border border-slate-800 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-300 text-sm">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              {item.category || 'skill'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400">
                              No evidence found
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.explanation}</p>
                        </div>

                        {item.job_source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} - ${item.job_source?.char_end ?? '?'}`,
                                resumeText: undefined,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded"
                            title="Inspect job requirement evidence"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PREFERRED SKILLS */}
          {activeTab === 'preferred' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
                  Preferred / Nice-to-Have Skills Matched ({preferredMatched.length})
                </h4>
                {preferredMatched.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No preferred skills matched.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preferredMatched.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-100 text-sm">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                              {item.category || 'skill'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300">
                              Bonus match
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{item.explanation}</p>
                        </div>

                        {(item.job_source || item.resume_source) && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                skillName: item.skill_name,
                                jobText: item.job_source?.source_text,
                                jobOffset: `${item.job_source?.char_start ?? '?'} - ${item.job_source?.char_end ?? '?'}`,
                                resumeText: item.resume_source?.source_text,
                                resumeOffset: `${item.resume_source?.char_start ?? '?'} - ${item.resume_source?.char_end ?? '?'}`,
                                explanation: item.explanation,
                              })
                            }
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded"
                            title="Inspect evidence spans"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                  Preferred Skills Not Mentioned ({preferredMissing.length})
                </h4>
                {preferredMissing.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No remaining preferred skills.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preferredMissing.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/30 border border-slate-800 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-300 text-sm">{item.skill_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              {item.category || 'skill'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: EXPERIENCE & EDUCATION */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              {/* Experience comparison card */}
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-semibold text-slate-100 text-sm">General Work Experience</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      report.experience_comparison.status === 'met'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : report.experience_comparison.status === 'partial'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {report.experience_comparison.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Required:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.experience_comparison.required_years !== null && report.experience_comparison.required_years !== undefined
                        ? `${report.experience_comparison.required_years}+ years`
                        : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Candidate Detected:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.experience_comparison.candidate_years !== null && report.experience_comparison.candidate_years !== undefined
                        ? `~${report.experience_comparison.candidate_years} years`
                        : 'Insufficient dates'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{report.experience_comparison.explanation}</p>
              </div>

              {/* Education comparison card */}
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-semibold text-slate-100 text-sm">Education & Credentials</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      report.education_comparison.status === 'met'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : report.education_comparison.status === 'partial'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {report.education_comparison.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Required:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.education_comparison.required_level || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Candidate Degree:</span>{' '}
                    <span className="font-semibold text-slate-200">
                      {report.education_comparison.candidate_level || 'No degree listed'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{report.education_comparison.explanation}</p>
              </div>
            </div>
          )}

          {/* TAB: DISCLOSURES & METHODOLOGY */}
          {activeTab === 'disclosures' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-2">
                <h4 className="text-sm font-semibold text-slate-100 flex items-center">
                  <Scale className="w-4 h-4 mr-2 text-indigo-400" />
                  Deterministic Formula & Reproducibility
                </h4>
                <p>
                  ApplyGraph calculates an <strong>Evidence-Grounded Qualification Index</strong> (0–100 scale). It is strictly a measure of verified requirement coverage, computed through deterministic mathematical weights:
                </p>
                <div className="p-3 bg-slate-950 font-mono text-[11px] rounded border border-slate-800 text-slate-300">
                  Overall Score = (0.60 * Required) + (0.20 * Preferred) + (0.10 * Experience) + (0.10 * Education)
                </div>
                <p className="text-slate-400">
                  Weights dynamically adjust when dimensions lack explicit requirements so candidates are never penalized for unrequested information.
                </p>
              </div>

              <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-2">
                <h4 className="text-sm font-semibold text-slate-100 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-indigo-400" />
                  Important Ethical Disclaimers
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Not a hiring probability:</strong> This score does not predict hiring decisions, candidate aptitude, or interview outcomes.</li>
                  <li><strong>Evidence vs absence:</strong> A missing skill indicates that no explicit mention was verified in the uploaded text. It does not prove a candidate cannot perform the task.</li>
                  <li><strong>Conservative matching:</strong> Keyword presence alone is treated as mention evidence, not certified proficiency.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Dual-Evidence Inspector Popover */}
        {activeEvidence && (
          <div className="px-6 py-4 bg-indigo-950/80 border-t border-indigo-900 flex flex-col space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-200 text-sm">
                Dual Evidence Inspector: {activeEvidence.skillName}
              </span>
              <button
                onClick={() => setActiveEvidence(null)}
                className="text-indigo-400 hover:text-indigo-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950 border border-indigo-800/50 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
                  <span>Job Description Requirement</span>
                  {activeEvidence.jobOffset && <span>Offsets: {activeEvidence.jobOffset}</span>}
                </div>
                <p className="font-mono text-slate-200 text-xs">
                  {activeEvidence.jobText ? `"${activeEvidence.jobText}"` : 'No exact snippet span'}
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-indigo-800/50 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                  <span>Candidate Resume Evidence</span>
                  {activeEvidence.resumeOffset && <span>Offsets: {activeEvidence.resumeOffset}</span>}
                </div>
                <p className="font-mono text-slate-200 text-xs">
                  {activeEvidence.resumeText ? `"${activeEvidence.resumeText}"` : 'No verified mention in resume'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
