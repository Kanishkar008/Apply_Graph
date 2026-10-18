import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Edit3,
  Save,
  Briefcase,
  GraduationCap,
  Layers,
  DollarSign,
  Info,
  Plus,
  Trash2,
  UserCheck,
  FileSearch,
} from 'lucide-react';
import {
  ParsedJobResponse,
  ParsedJobData,
  ParsedJobSkill,
  RequirementLevel,
} from '../types/job';
import { updateParsedJob, parseJob } from '../services/jobService';
import { Button, Badge, ConfirmDialog } from './ui';

interface Props {
  profile: ParsedJobResponse;
  title: string;
  onClose: () => void;
  onProfileUpdated: (updated: ParsedJobResponse) => void;
}

export const JobIntelligenceModal: React.FC<Props> = ({
  profile,
  title,
  onClose,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'experience' | 'responsibilities' | 'overview' | 'audit'>('skills');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isReparsing, setIsReparsing] = useState<boolean>(false);
  const [showReparseConfirm, setShowReparseConfirm] = useState<boolean>(false);
  const [activeEvidence, setActiveEvidence] = useState<{ label: string; text: string; offset?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable copy of parsed data
  const [formData, setFormData] = useState<ParsedJobData>(
    JSON.parse(JSON.stringify(profile.parsed_data))
  );

  // New skill input in edit mode
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('tool');
  const [newSkillLevel, setNewSkillLevel] = useState<RequirementLevel>('required');
  const [newSkillYears, setNewSkillYears] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveCorrections = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await updateParsedJob(profile.job_id, formData);
      setSuccessMsg('Job corrections saved. Marked as User-Verified.');
      setIsEditing(false);
      onProfileUpdated(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save corrections.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeReparse = async () => {
    setShowReparseConfirm(false);
    setIsReparsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const refreshed = await parseJob(profile.job_id, true, true);
      setFormData(JSON.parse(JSON.stringify(refreshed.parsed_data)));
      setSuccessMsg('Job re-parsed with fresh extraction snapshot.');
      setIsEditing(false);
      onProfileUpdated(refreshed);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to re-parse job.');
    } finally {
      setIsReparsing(false);
    }
  };

  const handleReparseClick = () => {
    if (profile.is_user_corrected) {
      setShowReparseConfirm(true);
    } else {
      executeReparse();
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const yearsNum = newSkillYears ? parseFloat(newSkillYears) : null;
    const newSkill: ParsedJobSkill = {
      name: newSkillName.trim(),
      category: newSkillCategory,
      requirement_level: newSkillLevel,
      years_required: isNaN(yearsNum as number) ? null : yearsNum,
      origin: 'user_added',
      source: null,
    };

    if (newSkillLevel === 'preferred') {
      setFormData((prev) => ({
        ...prev,
        preferred_skills: [...prev.preferred_skills, newSkill],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, newSkill],
      }));
    }

    setNewSkillName('');
    setNewSkillYears('');
  };

  const handleRemoveSkill = (skillName: string, isPreferred: boolean) => {
    if (isPreferred) {
      setFormData((prev) => ({
        ...prev,
        preferred_skills: prev.preferred_skills.filter((s) => s.name !== skillName),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        required_skills: prev.required_skills.filter((s) => s.name !== skillName),
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-modal overflow-hidden my-auto animate-slide-up text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#21262d] bg-[#0d1117]/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base">
                  {formData.title || title}
                </h3>
                {profile.is_user_corrected ? (
                  <Badge variant="teal" icon={<UserCheck className="h-3 w-3" />}>
                    User-Verified
                  </Badge>
                ) : (
                  <Badge variant="brand" icon={<Sparkles className="h-3 w-3" />}>
                    Parser Ingested
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formData.company || 'Company unspecified'} • {formData.location || 'Location unspecified'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setIsEditing(true)}
                  icon={<Edit3 className="h-3.5 w-3.5 text-brand-400" />}
                >
                  Correct Facts
                </Button>

                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleReparseClick}
                  loading={isReparsing}
                  icon={<RotateCw className="h-3.5 w-3.5 text-slate-400" />}
                >
                  Re-Parse
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="teal"
                  size="xs"
                  onClick={handleSaveCorrections}
                  loading={isSaving}
                  icon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Corrections
                </Button>

                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setFormData(JSON.parse(JSON.stringify(profile.parsed_data)));
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors ml-1"
              aria-label="Close job intelligence modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Warnings Banner */}
        {profile.parse_warnings.length > 0 && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Ambiguities Flagged ({profile.parse_warnings.length}):</span>
            </div>
            <ul className="list-disc list-inside text-amber-200/90 space-y-0.5 text-[11px] pl-6">
              {profile.parse_warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-[#21262d] flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'skills'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Skills Breakdown ({formData.required_skills.length + formData.preferred_skills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('experience')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'experience'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Experience & Education</span>
          </button>

          <button
            onClick={() => setActiveTab('responsibilities')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'responsibilities'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Responsibilities ({formData.responsibilities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Compensation & Role</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span>Provenance Audit</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Mandatory Required Skills */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Mandatory Required Skills ({formData.required_skills.length})
                </h4>
                {formData.required_skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No mandatory skills detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium gap-2 ${
                          skill.requirement_level === 'ambiguous'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-[#0d1117] border-[#30363d] text-slate-200'
                        }`}
                      >
                        <span className="font-semibold text-slate-100">{skill.name}</span>
                        {skill.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] text-slate-300 border border-[#30363d]">
                            {skill.category}
                          </span>
                        )}
                        {skill.years_required !== null && skill.years_required !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/15 text-brand-300 font-mono">
                            {skill.years_required}+ yrs
                          </span>
                        )}
                        {skill.requirement_level === 'ambiguous' && (
                          <span className="px-1 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
                            ambiguous
                          </span>
                        )}
                        {skill.source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                label: `Skill Evidence: ${skill.name}`,
                                text: skill.source?.source_text || '',
                                offset: `${skill.source?.char_start ?? '?'} – ${skill.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-0.5 text-brand-400 hover:text-white"
                            title="Inspect verbatim evidence span"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSkill(skill.name, false)}
                            className="text-rose-400 hover:text-rose-300 p-0.5"
                            title="Remove skill"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Skills */}
              <div className="pt-4 border-t border-[#21262d]">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                  Preferred Qualifications ({formData.preferred_skills.length})
                </h4>
                {formData.preferred_skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No preferred skills detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.preferred_skills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-slate-200 text-xs font-medium gap-2"
                      >
                        <span className="font-semibold text-slate-100">{skill.name}</span>
                        {skill.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] text-slate-300 border border-[#30363d]">
                            {skill.category}
                          </span>
                        )}
                        {skill.years_required !== null && skill.years_required !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/15 text-brand-300 font-mono">
                            {skill.years_required}+ yrs
                          </span>
                        )}
                        {skill.source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                label: `Preferred Skill Evidence: ${skill.name}`,
                                text: skill.source?.source_text || '',
                                offset: `${skill.source?.char_start ?? '?'} – ${skill.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-0.5 text-brand-400 hover:text-white"
                            title="Inspect verbatim evidence span"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSkill(skill.name, true)}
                            className="text-rose-400 hover:text-rose-300 p-0.5"
                            title="Remove skill"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Skill form in edit mode */}
              {isEditing && (
                <div className="mt-4 p-4 border border-dashed border-brand-500/40 bg-brand-500/5 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Skill Requirement
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Skill name (e.g. Rust)"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-100 focus:outline-none focus:border-brand-500/60"
                    />
                    <select
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-100 focus:outline-none focus:border-brand-500/60"
                    >
                      <option value="language">Language</option>
                      <option value="framework">Framework</option>
                      <option value="database">Database</option>
                      <option value="tool">Tool / DevOps</option>
                      <option value="cloud">Cloud</option>
                      <option value="soft_skill">Soft Skill</option>
                    </select>
                    <select
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(e.target.value as RequirementLevel)}
                      className="px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-100 focus:outline-none focus:border-brand-500/60"
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                      <option value="ambiguous">Ambiguous</option>
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Years req."
                        value={newSkillYears}
                        onChange={(e) => setNewSkillYears(e.target.value)}
                        className="w-24 px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-slate-100 focus:outline-none focus:border-brand-500/60"
                      />
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={handleAddSkill}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPERIENCE & EDUCATION */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-brand-400" />
                  Experience Requirements ({formData.experience_requirements.length})
                </span>
                {formData.experience_requirements.length === 0 ? (
                  <p className="text-xs text-slate-400">No explicit years of experience required.</p>
                ) : (
                  formData.experience_requirements.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-300">
                          {exp.min_years ? `${exp.min_years}${exp.max_years ? `–${exp.max_years}` : '+'} years` : 'Experience noted'}
                        </span>
                        {exp.source && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Chars {exp.source.char_start ?? '?'} – {exp.source.char_end ?? '?'}
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-slate-300">{exp.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-brand-400" />
                  Education Requirements ({formData.education_requirements.length})
                </span>
                {formData.education_requirements.length === 0 ? (
                  <p className="text-xs text-slate-400">No specific degree credentials explicitly required.</p>
                ) : (
                  formData.education_requirements.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">
                          {edu.degree_level || 'Degree requirement'} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                        </span>
                        <Badge variant={edu.requirement_level === 'required' ? 'teal' : 'amber'}>
                          {edu.requirement_level}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESPONSIBILITIES */}
          {activeTab === 'responsibilities' && (
            <div className="space-y-3">
              {formData.responsibilities.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No structured responsibilities identified.</p>
              ) : (
                formData.responsibilities.map((resp, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-slate-300 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resp.text}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: COMPENSATION & OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Salary / Compensation</span>
                  <p className="text-sm font-bold text-teal-400">
                    {formData.salary?.min_amount && formData.salary?.max_amount
                      ? `$${formData.salary.min_amount.toLocaleString()} – $${formData.salary.max_amount.toLocaleString()} ${formData.salary.currency || 'USD'}${formData.salary.interval ? ` / ${formData.salary.interval}` : ''}`
                      : formData.salary?.raw_salary_text || 'No salary disclosure detected'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Location & Employment Type</span>
                  <p className="text-xs text-slate-200 font-medium">
                    {formData.location || 'Remote / Unspecified'}
                    {formData.employment_type ? ` • ${formData.employment_type}` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileSearch className="h-4 w-4 text-brand-400" />
                  <span>Immutable Parser Ingestion Snapshot</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deterministic baseline extracted directly from the uploaded posting.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0d1117] font-mono text-[11px] text-slate-300 overflow-x-auto border border-[#30363d] max-h-96">
                <pre>{JSON.stringify(profile.parsed_data, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Popover Modal */}
        {activeEvidence && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#1c2128] border border-[#30363d] rounded-2xl p-5 max-w-lg w-full shadow-modal space-y-3 animate-slide-up">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2.5">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-brand-400" />
                  <span>{activeEvidence.label}</span>
                </span>
                <button
                  onClick={() => setActiveEvidence(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Verbatim excerpt from job posting {activeEvidence.offset ? `(Chars: ${activeEvidence.offset})` : ''}:
              </p>
              <blockquote className="p-3 rounded-lg bg-[#0d1117] font-mono text-xs text-brand-200 whitespace-pre-wrap border border-[#30363d] border-l-2 border-l-brand-500 leading-relaxed">
                "{activeEvidence.text}"
              </blockquote>
              <div className="text-right">
                <Button variant="secondary" size="xs" onClick={() => setActiveEvidence(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Re-parse Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showReparseConfirm}
          title="Re-Parse Job Posting"
          description="This job profile has manual user corrections. Re-parsing will overwrite your manual edits with fresh extraction output. Do you want to proceed?"
          confirmLabel="Re-Parse & Overwrite"
          variant="warning"
          loading={isReparsing}
          onConfirm={executeReparse}
          onCancel={() => setShowReparseConfirm(false)}
        />
      </div>
    </div>
  );
};
