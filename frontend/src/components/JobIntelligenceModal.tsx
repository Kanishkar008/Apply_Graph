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
          'This job profile has manual user corrections. Re-parsing will overwrite manual edits with a fresh parser extraction. Do you want to proceed?'
        )
      ) {
        return;
      }
    }

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

  const handleRemoveSkill = (name: string, isPref: boolean) => {
    if (isPref) {
      setFormData((prev) => ({
        ...prev,
        preferred_skills: prev.preferred_skills.filter((s) => s.name !== name),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        required_skills: prev.required_skills.filter((s) => s.name !== name),
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-slate-100">{formData.title || title}</h3>
                {profile.is_user_corrected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <UserCheck className="w-3 h-3 mr-1" />
                    User-Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Extracted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {formData.company || 'Unknown Company'} {formData.location ? `• ${formData.location}` : ''}{' '}
                {formData.employment_type ? `• ${formData.employment_type}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                id="edit-corrections-btn"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Review & Correct
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setFormData(JSON.parse(JSON.stringify(profile.parsed_data)));
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCorrections}
                  disabled={isSaving}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50"
                  id="save-corrections-btn"
                >
                  {isSaving ? (
                    <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Changes
                </button>
              </div>
            )}

            <button
              onClick={() => handleReparse()}
              disabled={isReparsing}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Re-run deterministic extraction"
              id="reparse-btn"
            >
              <RotateCw className={`w-4 h-4 ${isReparsing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close intelligence modal"
              id="close-job-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center space-x-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-center space-x-2 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Parse Warnings */}
        {profile.parse_warnings && profile.parse_warnings.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Parser Ambiguity & Coverage Warnings ({profile.parse_warnings.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 pl-1">
              {profile.parse_warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 mt-2 space-x-4">
          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'skills'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Skills ({formData.required_skills.length + formData.preferred_skills.length})</span>
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
            <span>Qualifications & Edu</span>
          </button>
          <button
            onClick={() => setActiveTab('responsibilities')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'responsibilities'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Responsibilities ({formData.responsibilities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Compensation & Role</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Provenance Audit</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Required Skills */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                  Mandatory Required Skills ({formData.required_skills.length})
                </h4>
                {formData.required_skills.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No mandatory skills detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium space-x-2 ${
                          skill.requirement_level === 'ambiguous'
                            ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="font-semibold text-slate-100">{skill.name}</span>
                        {skill.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                            {skill.category}
                          </span>
                        )}
                        {skill.years_required !== null && skill.years_required !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
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
                                offset: `${skill.source?.char_start ?? '?'} - ${skill.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-0.5 text-indigo-400 hover:text-indigo-300"
                            title="Inspect verbatim evidence span"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSkill(skill.name, false)}
                            className="text-red-400 hover:text-red-300 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Skills */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
                  Preferred / Nice-to-Have Skills ({formData.preferred_skills.length})
                </h4>
                {formData.preferred_skills.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No preferred skills detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.preferred_skills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 text-xs font-medium space-x-2"
                      >
                        <span className="font-semibold text-slate-100">{skill.name}</span>
                        {skill.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                            {skill.category}
                          </span>
                        )}
                        {skill.years_required !== null && skill.years_required !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
                            {skill.years_required}+ yrs
                          </span>
                        )}
                        {skill.source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                label: `Preferred Skill Evidence: ${skill.name}`,
                                text: skill.source?.source_text || '',
                                offset: `${skill.source?.char_start ?? '?'} - ${skill.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-0.5 text-indigo-400 hover:text-indigo-300"
                            title="Inspect verbatim evidence span"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSkill(skill.name, true)}
                            className="text-red-400 hover:text-red-300 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Skill form in edit mode */}
              {isEditing && (
                <div className="mt-4 p-4 border border-dashed border-indigo-500/40 bg-indigo-950/10 rounded-lg space-y-3">
                  <h5 className="text-xs font-semibold text-indigo-300 flex items-center">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Skill Requirement
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Skill name (e.g. Rust)"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-100"
                    />
                    <select
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-100"
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
                      className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-100"
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                      <option value="ambiguous">Ambiguous</option>
                    </select>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Years req."
                        value={newSkillYears}
                        onChange={(e) => setNewSkillYears(e.target.value)}
                        className="w-24 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-100"
                      />
                      <button
                        onClick={handleAddSkill}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: QUALIFICATIONS & EDUCATION */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              {/* Experience Requirements */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Experience Requirements ({formData.experience_requirements.length})
                </h4>
                {formData.experience_requirements.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No general experience requirements detected.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.experience_requirements.map((exp, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-indigo-300 text-sm">
                              {exp.min_years ? `${exp.min_years}+ years` : 'Experience'}
                              {exp.max_years ? ` (up to ${exp.max_years} years)` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{exp.description}</p>
                        </div>
                        {exp.source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                label: `Experience Requirement Evidence #${idx + 1}`,
                                text: exp.source?.source_text || '',
                                offset: `${exp.source?.char_start ?? '?'} - ${exp.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-1 text-indigo-400 hover:text-indigo-300"
                            title="Inspect verbatim evidence span"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education Requirements */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Education Requirements ({formData.education_requirements.length})
                </h4>
                {formData.education_requirements.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No education credentials detected.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.education_requirements.map((edu, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-lg flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4 text-indigo-400" />
                            <span className="font-semibold text-slate-200 text-sm">
                              {edu.degree_level || 'Degree'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                              {edu.requirement_level}
                            </span>
                          </div>
                          {edu.field_of_study && (
                            <p className="text-xs text-slate-400">Field: {edu.field_of_study}</p>
                          )}
                        </div>
                        {edu.source && (
                          <button
                            onClick={() =>
                              setActiveEvidence({
                                label: `Education Evidence #${idx + 1}`,
                                text: edu.source?.source_text || '',
                                offset: `${edu.source?.char_start ?? '?'} - ${edu.source?.char_end ?? '?'}`,
                              })
                            }
                            className="p-1 text-indigo-400 hover:text-indigo-300"
                            title="Inspect verbatim evidence span"
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

          {/* TAB: RESPONSIBILITIES */}
          {activeTab === 'responsibilities' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Core Responsibilities ({formData.responsibilities.length})
              </h4>
              {formData.responsibilities.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No responsibilities identified.</p>
              ) : (
                <div className="space-y-2">
                  {formData.responsibilities.map((resp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-start justify-between space-x-3 text-xs text-slate-200"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{resp.text}</span>
                      </div>
                      {resp.source && (
                        <button
                          onClick={() =>
                            setActiveEvidence({
                              label: `Responsibility Evidence #${idx + 1}`,
                              text: resp.source?.source_text || '',
                              offset: `${resp.source?.char_start ?? '?'} - ${resp.source?.char_end ?? '?'}`,
                            })
                          }
                          className="p-1 text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                          title="Inspect evidence span"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: OVERVIEW & COMPENSATION */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Compensation Details
                </h4>
                {formData.salary ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-lg font-bold text-slate-100">
                          {formData.salary.currency || '$'}{' '}
                          {formData.salary.min_amount?.toLocaleString() || 'N/A'}{' '}
                          {formData.salary.max_amount ? `- ${formData.salary.max_amount.toLocaleString()}` : ''}
                        </div>
                        <span className="text-xs text-slate-400">
                          Frequency: {formData.salary.interval || 'yearly'}
                        </span>
                      </div>
                    </div>
                    {formData.salary.raw_salary_text && (
                      <p className="text-xs text-slate-400 italic">
                        Raw text: &ldquo;{formData.salary.raw_salary_text}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No salary or compensation specified in job description.</p>
                )}
              </div>

              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3 text-xs">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Role Metadata
                </h4>
                <div className="grid grid-cols-2 gap-4 text-slate-300">
                  <div>
                    <span className="text-slate-500">Title:</span>{' '}
                    <span className="font-semibold text-slate-200">{formData.title || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Company:</span>{' '}
                    <span className="font-semibold text-slate-200">{formData.company || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>{' '}
                    <span className="font-semibold text-slate-200">{formData.location || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Employment Type:</span>{' '}
                    <span className="font-semibold text-slate-200">{formData.employment_type || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT & PROVENANCE */}
          {activeTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                  <FileSearch className="w-4 h-4 mr-1.5 text-indigo-400" />
                  Provenance Audit Snapshot
                </h4>
                <p className="text-slate-400">
                  ApplyGraph preserves an immutable snapshot of original extracted data separate from user corrections.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block mb-1">Original Extracted Skills:</span>
                    <span className="font-mono text-slate-200">
                      {(profile.extracted_data?.required_skills?.length || 0) +
                        (profile.extracted_data?.preferred_skills?.length || 0)}{' '}
                      mentions
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                    <span className="text-slate-500 block mb-1">Active User-Reviewed Skills:</span>
                    <span className="font-mono text-slate-200">
                      {formData.required_skills.length + formData.preferred_skills.length} mentions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Popover */}
        {activeEvidence && (
          <div className="px-6 py-3 bg-indigo-950/70 border-t border-indigo-900/60 flex items-start justify-between space-x-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-indigo-300">{activeEvidence.label}</span>
              {activeEvidence.offset && (
                <span className="text-[10px] text-indigo-400/80 ml-2 font-mono">
                  (Char offsets: {activeEvidence.offset})
                </span>
              )}
              <p className="font-mono bg-slate-950 p-2 rounded border border-indigo-800/40 text-slate-200">
                &ldquo;{activeEvidence.text}&rdquo;
              </p>
            </div>
            <button
              onClick={() => setActiveEvidence(null)}
              className="text-indigo-400 hover:text-indigo-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
