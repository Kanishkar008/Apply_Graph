import React, { useState } from 'react';
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
  Trash2,
  UserCheck,
  FileSearch,
} from 'lucide-react';
import {
  ParsedResumeResponse,
  ParsedResumeData,
  ParsedSkill,
} from '../types/resume';
import { updateParsedResume, parseResume } from '../services/resumeService';

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
  React.useEffect(() => {
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
      setSuccessMsg('Corrections saved successfully. Marked as User-Verified.');
      setIsEditing(false);
      onProfileUpdated(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save corrections.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReparse = async (forceOverwrite: boolean = false) => {
    if (profile.is_user_corrected && !forceOverwrite) {
      if (
        !window.confirm(
          'This profile has manual user corrections. Re-parsing will overwrite your manual edits with fresh extraction. Do you want to proceed?'
        )
      ) {
        return;
      }
    }

    setIsReparsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const refreshed = await parseResume(profile.resume_id, true, true);
      setSuccessMsg('Resume re-parsed successfully.');
      setFormData(JSON.parse(JSON.stringify(refreshed.parsed_data)));
      setIsEditing(false);
      onProfileUpdated(refreshed);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Re-parse failed.');
    } finally {
      setIsReparsing(false);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {formData.candidate_name || filename}
                </h3>
                {profile.is_user_corrected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <UserCheck className="h-3 w-3" />
                    <span>User Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="h-3 w-3" />
                    <span>Parser Extracted</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {formData.email || 'No email detected'} • {formData.location || 'Location unspecified'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Correct Facts</span>
                </button>

                <button
                  onClick={() => handleReparse(false)}
                  disabled={isReparsing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                  title="Re-run deterministic parser"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isReparsing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                  <span>Re-Parse</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveCorrections}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Corrections'}</span>
                </button>

                <button
                  onClick={() => {
                    setFormData(JSON.parse(JSON.stringify(profile.parsed_data)));
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
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
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Warnings Banner */}
        {profile.parse_warnings.length > 0 && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Parser Noted {profile.parse_warnings.length} Ambiguities / Anomaly Flags:</span>
            </div>
            <ul className="list-disc list-inside text-amber-200/80 space-y-0.5 text-[11px] pl-6">
              {profile.parse_warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'skills'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Skills & Evidence ({formData.skills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('experience')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'experience'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Experience ({formData.work_experience.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'education'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Education & Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Profile & Summary</span>
          </button>

          {profile.extracted_data && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-indigo-400'
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
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Add Verified Skill</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PyTorch, Rust, Docker"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="language">Language</option>
                      <option value="framework">Framework</option>
                      <option value="database">Database</option>
                      <option value="cloud">Cloud</option>
                      <option value="tool">Tool</option>
                      <option value="soft_skill">Soft Skill</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      Add
                    </button>
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
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-indigo-500/50'
                            }`}
                          >
                            <span>{skill.name}</span>
                            {skill.source && (
                              <Info className="h-3 w-3 text-slate-400 group-hover:text-indigo-400" />
                            )}
                            {skill.origin === 'user_added' && (
                              <span className="text-[9px] bg-emerald-500/20 px-1 rounded text-emerald-300 font-mono">
                                user
                              </span>
                            )}
                            {isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSkill(globalIdx);
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors ml-1"
                              >
                                <Trash2 className="h-3 w-3" />
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
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 relative"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {exp.role || 'Unspecified Role'}
                        </h4>
                        <p className="text-xs text-indigo-400 font-medium">
                          {exp.company || 'Unspecified Company'}
                        </p>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {exp.start_date || '?'} — {exp.end_date || (exp.is_current ? 'Present' : '?')}
                      </span>
                    </div>

                    {exp.highlights.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 pt-2">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    )}

                    {exp.source && (
                      <button
                        onClick={() =>
                          setActiveEvidence({
                            label: `Experience: ${exp.role || ''} at ${exp.company || ''}`,
                            text: exp.source?.source_text || '',
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 pt-1 font-mono"
                      >
                        <Info className="h-3 w-3" />
                        <span>Inspect Source Evidence</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: EDUCATION & PROJECTS */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              {/* Education Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-400" />
                  <span>Education</span>
                </h4>
                {formData.education.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No education entries extracted.</p>
                ) : (
                  formData.education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-semibold text-white text-xs">{edu.degree || 'Degree'}</p>
                        <p className="text-xs text-indigo-400">{edu.institution || 'Institution'}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{edu.end_date || ''}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Projects Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-indigo-400" />
                  <span>Projects</span>
                </h4>
                {formData.projects.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No projects extracted.</p>
                ) : (
                  formData.projects.map((proj, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <p className="font-semibold text-white text-xs">{proj.name}</p>
                      {proj.description && <p className="text-xs text-slate-400">{proj.description}</p>}
                      {proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.technologies.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
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

              {/* Certifications Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-400" />
                  <span>Certifications</span>
                </h4>
                {formData.certifications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No certifications extracted.</p>
                ) : (
                  formData.certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs"
                    >
                      <span className="text-white font-medium">{cert.name}</span>
                      <span className="text-slate-400 font-mono">{cert.date || ''}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OVERVIEW & CONTACT */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Candidate Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.candidate_name || ''}
                      onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.candidate_name || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Email Address</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.email || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Phone</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.phone || 'Not detected'}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Location</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.location || 'Not detected'}</p>
                  )}
                </div>
              </div>

              {formData.summary && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Professional Summary</span>
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white leading-relaxed"
                    />
                  ) : (
                    <p className="text-slate-300 leading-relaxed">{formData.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT SNAPSHOT */}
          {activeTab === 'audit' && profile.extracted_data && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileSearch className="h-4 w-4 text-indigo-400" />
                  <span>Immutable Parser Audit Snapshot</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This baseline represents the original, unedited output produced by the deterministic parser.
                  Even when you correct skills or dates, this record is preserved to ensure full provenance tracking.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800 max-h-96">
                <pre>{JSON.stringify(profile.extracted_data, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Popover Modal */}
        {activeEvidence && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-400" />
                  <span>{activeEvidence.label} — Source Evidence</span>
                </span>
                <button
                  onClick={() => setActiveEvidence(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Verbatim snippet extracted directly from resume text:</p>
              <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 whitespace-pre-wrap border border-slate-800">
                "{activeEvidence.text}"
              </div>
              <div className="text-right">
                <button
                  onClick={() => setActiveEvidence(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
