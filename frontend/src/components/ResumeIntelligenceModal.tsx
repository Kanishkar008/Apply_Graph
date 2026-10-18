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
  FolderGit2,
  Award,
  Layers,
  Info,
  Plus,
  UserCheck,
  FileSearch,
} from 'lucide-react';
import {
  ParsedResumeResponse,
  ParsedResumeData,
  ParsedSkill,
} from '../types/resume';
import { updateParsedResume, parseResume } from '../services/resumeService';
import { Button, Badge, ConfirmDialog } from './ui';

interface Props {
  profile: ParsedResumeResponse;
  filename: string;
  onClose: () => void;
  onProfileUpdated: (updated: ParsedResumeResponse) => void;
}

export const ResumeIntelligenceModal: React.FC<Props> = ({
  profile,
  filename,
  onClose,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'experience' | 'education' | 'overview' | 'audit'>('skills');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isReparsing, setIsReparsing] = useState<boolean>(false);
  const [showReparseConfirm, setShowReparseConfirm] = useState<boolean>(false);
  const [activeEvidence, setActiveEvidence] = useState<{ label: string; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable copy
  const [formData, setFormData] = useState<ParsedResumeData>(
    JSON.parse(JSON.stringify(profile.parsed_data))
  );

  // New skill input in edit mode
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('tool');

  // Escape key accessibility
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
      const updated = await updateParsedResume(profile.resume_id, formData);
      setSuccessMsg('Corrections saved successfully. Profile marked as User-Verified.');
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
      const refreshed = await parseResume(profile.resume_id, true, true);
      setSuccessMsg('Resume re-parsed successfully with fresh extraction.');
      setFormData(JSON.parse(JSON.stringify(refreshed.parsed_data)));
      setIsEditing(false);
      onProfileUpdated(refreshed);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Re-parse failed.');
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
    const newSkill: ParsedSkill = {
      name: newSkillName.trim(),
      category: newSkillCategory,
      origin: 'user_added',
      source: null,
    };
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));
    setNewSkillName('');
  };

  const handleRemoveSkill = (skillIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, idx) => idx !== skillIndex),
    }));
  };

  const groupedSkills = formData.skills.reduce((acc, skill) => {
    const cat = skill.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, ParsedSkill[]>);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-modal overflow-hidden my-auto animate-slide-up text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#21262d] bg-[#0d1117]/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base">
                  {formData.candidate_name || filename}
                </h3>
                {profile.is_user_corrected ? (
                  <Badge variant="teal" icon={<UserCheck className="h-3 w-3" />}>
                    User Verified
                  </Badge>
                ) : (
                  <Badge variant="brand" icon={<Sparkles className="h-3 w-3" />}>
                    Parser Extracted
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formData.email || 'No email detected'} • {formData.location || 'Location unspecified'}
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
                  id="edit-corrections-btn"
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
                  id="save-corrections-btn"
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
              id="close-resume-modal-btn"
              aria-label="Close intelligence modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors ml-1"
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
              <span>Parser Noted {profile.parse_warnings.length} Ambiguities / Anomaly Flags:</span>
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
            <span>Skills & Evidence ({formData.skills.length})</span>
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
            <span>Experience ({formData.work_experience.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'education'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Education & Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Profile & Summary</span>
          </button>

          {profile.extracted_data && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 border-b-2 font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSearch className="h-3.5 w-3.5" />
              <span>Provenance & Audit</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {isEditing && (
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-brand-400" />
                    <span>Add Verified Skill</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PyTorch, Rust, Docker"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
                    />
                    <select
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500/60"
                    >
                      <option value="language">Language</option>
                      <option value="framework">Framework</option>
                      <option value="database">Database</option>
                      <option value="cloud">Cloud</option>
                      <option value="tool">Tool</option>
                      <option value="soft_skill">Soft Skill</option>
                    </select>
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={handleAddSkill}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {Object.keys(groupedSkills).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No skills catalogued.</p>
              ) : (
                Object.entries(groupedSkills).map(([category, skills]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {category} ({skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => {
                        const globalIdx = formData.skills.indexOf(skill);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (skill.source) {
                                setActiveEvidence({
                                  label: `Skill: ${skill.name}`,
                                  text: skill.source.source_text,
                                });
                              }
                            }}
                            className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              skill.origin === 'user_added'
                                ? 'bg-teal-500/10 text-teal-300 border-teal-500/25'
                                : 'bg-[#0d1117] hover:bg-[#21262d] text-slate-200 border-[#30363d] hover:border-brand-500/50'
                            }`}
                          >
                            <span>{skill.name}</span>
                            {skill.source && (
                              <Info className="h-3 w-3 text-slate-500 group-hover:text-brand-400" />
                            )}
                            {skill.origin === 'user_added' && (
                              <span className="text-[9px] bg-teal-500/20 px-1 rounded text-teal-300 font-mono">
                                user
                              </span>
                            )}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSkill(globalIdx);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5 ml-0.5"
                                title="Remove skill"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {formData.work_experience.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No work experience extracted.</p>
              ) : (
                formData.work_experience.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 text-xs">
                        {exp.role || 'Role'} <span className="text-slate-400 font-normal">at</span> {exp.company || 'Company'}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {exp.start_date || 'Start'} – {exp.is_current ? 'Present' : exp.end_date || 'End'}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-slate-300 leading-relaxed">{exp.description}</p>
                    )}
                    {exp.highlights.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-1">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    )}
                    {exp.skills_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {exp.skills_used.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#161b22] text-slate-300 border border-[#30363d]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: EDUCATION & PROJECTS */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              {/* Education */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-400" />
                  <span>Education</span>
                </h4>
                {formData.education.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No education entries extracted.</p>
                ) : (
                  formData.education.map((edu, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-xs">
                          {edu.degree || 'Degree'} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {edu.start_date || ''} – {edu.end_date || ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{edu.institution || 'Institution'}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Projects */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-brand-400" />
                  <span>Projects</span>
                </h4>
                {formData.projects.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No projects extracted.</p>
                ) : (
                  formData.projects.map((proj, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1.5">
                      <p className="font-bold text-slate-100 text-xs">{proj.name}</p>
                      {proj.description && <p className="text-xs text-slate-400 leading-relaxed">{proj.description}</p>}
                      {proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.technologies.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#161b22] text-slate-300 border border-[#30363d]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Certifications */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-brand-400" />
                  <span>Certifications</span>
                </h4>
                {formData.certifications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No certifications extracted.</p>
                ) : (
                  formData.certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex justify-between items-center text-xs"
                    >
                      <span className="text-slate-200 font-medium">{cert.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{cert.date || ''}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OVERVIEW & PROFILE */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Candidate Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.candidate_name || ''}
                      onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-white focus:outline-none focus:border-brand-500/60"
                    />
                  ) : (
                    <p className="text-slate-100 font-medium">{formData.candidate_name || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Email Address</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-white focus:outline-none focus:border-brand-500/60"
                    />
                  ) : (
                    <p className="text-slate-100 font-medium">{formData.email || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Phone Number</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-white focus:outline-none focus:border-brand-500/60"
                    />
                  ) : (
                    <p className="text-slate-100 font-medium">{formData.phone || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Location</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-white focus:outline-none focus:border-brand-500/60"
                    />
                  ) : (
                    <p className="text-slate-100 font-medium">{formData.location || 'Not detected'}</p>
                  )}
                </div>
              </div>

              {formData.summary && (
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Professional Summary</span>
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white leading-relaxed focus:outline-none focus:border-brand-500/60"
                    />
                  ) : (
                    <p className="text-slate-300 leading-relaxed">{formData.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === 'audit' && profile.extracted_data && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileSearch className="h-4 w-4 text-brand-400" />
                  <span>Immutable Baseline Extraction Snapshot</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Preserved deterministic baseline produced on initial parser run. Any user adjustments are applied on top of this audit trail.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0d1117] font-mono text-[11px] text-slate-300 overflow-x-auto border border-[#30363d] max-h-96">
                <pre>{JSON.stringify(profile.extracted_data, null, 2)}</pre>
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
                  <Info className="h-4 w-4 text-teal-400" />
                  <span>{activeEvidence.label} — Source Proof</span>
                </span>
                <button
                  onClick={() => setActiveEvidence(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Verbatim quote extracted directly from candidate resume document:</p>
              <blockquote className="p-3 rounded-lg bg-[#0d1117] font-mono text-xs text-teal-300 whitespace-pre-wrap border border-[#30363d] border-l-2 border-l-teal-500 leading-relaxed">
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
          title="Re-Parse Resume"
          description="This candidate profile has manual user corrections. Re-parsing will overwrite your manual edits with fresh extraction output. Do you want to proceed?"
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
