import type { MissingSkillItem, MatchedSkillItem } from '../types/match';

/**
 * Evaluates whether a skill item (matched or missing) represents an ambiguous requirement.
 * Checks both requirement_level and status in a case-insensitive, whitespace-tolerant manner
 * aligned with the backend schema (RequirementLevel and SkillMatchStatus).
 */
export const isAmbiguousSkill = (skill: {
  requirement_level?: string | null;
  status?: string | null;
}): boolean => {
  const reqLevel = String(skill.requirement_level ?? '').trim().toLowerCase();
  const status = String(skill.status ?? '').trim().toLowerCase();

  return (
    reqLevel === 'ambiguous' ||
    status === 'ambiguous_requirement' ||
    status === 'ambiguous' ||
    status.includes('ambiguous')
  );
};

/**
 * Returns genuine, eligible missing competencies for verified evaluation and semantic search.
 * Ambiguous requirements are strictly excluded to avoid penalizing candidates or searching unconfirmed terms.
 */
export const getEligibleMissingSkills = (
  missingSkills: MissingSkillItem[] = []
): MissingSkillItem[] => {
  return missingSkills.filter((s) => !isAmbiguousSkill(s));
};

/**
 * Returns ambiguous skill requirements (matched or missing) for transparent disclosure reporting.
 */
export const getAmbiguousSkills = <
  T extends { requirement_level?: string | null; status?: string | null }
>(
  skills: T[] = []
): T[] => {
  return skills.filter((s) => isAmbiguousSkill(s));
};

/**
 * Filter matched skills by requirement level ('required' or 'preferred'), excluding ambiguous skills.
 */
export const getVerifiedMatchedSkills = (
  matchedSkills: MatchedSkillItem[] = [],
  level: 'required' | 'preferred'
): MatchedSkillItem[] => {
  return matchedSkills.filter(
    (s) =>
      !isAmbiguousSkill(s) &&
      String(s.requirement_level ?? '').trim().toLowerCase() === level
  );
};

/**
 * Filter genuine missing skills by requirement level ('required' or 'preferred'), excluding ambiguous skills.
 */
export const getVerifiedMissingSkillsByLevel = (
  missingSkills: MissingSkillItem[] = [],
  level: 'required' | 'preferred'
): MissingSkillItem[] => {
  return missingSkills.filter(
    (s) =>
      !isAmbiguousSkill(s) &&
      String(s.requirement_level ?? '').trim().toLowerCase() === level
  );
};
