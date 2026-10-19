import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  isAmbiguousSkill,
  getEligibleMissingSkills,
  getAmbiguousSkills,
  getVerifiedMatchedSkills,
  getVerifiedMissingSkillsByLevel,
} from '../src/utils/skillFilters.ts';

describe('skillFilters regression suite', () => {
  test('isAmbiguousSkill detects ambiguous skills in various casings and statuses', () => {
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: 'ambiguous', status: 'ambiguous_requirement' }),
      true
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: 'AMBIGUOUS', status: 'AMBIGUOUS_REQUIREMENT' }),
      true
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: ' Ambiguous ', status: 'missing_evidence' }),
      true
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: 'required', status: 'ambiguous_requirement' }),
      true
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: undefined, status: 'ambiguous_requirement' }),
      true
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: 'required', status: 'missing_evidence' }),
      false
    );
    assert.strictEqual(
      isAmbiguousSkill({ requirement_level: 'preferred', status: 'missing_evidence' }),
      false
    );
  });

  test('regression: report with only ambiguous R requirement yields zero explorer gaps', () => {
    const missingSkills = [
      {
        skill_name: 'R',
        category: 'language',
        requirement_level: 'ambiguous',
        status: 'ambiguous_requirement',
        explanation: 'Ambiguous requirement level for R in job description.',
      },
    ];

    const eligibleMissing = getEligibleMissingSkills(missingSkills);
    const ambiguousMissing = getAmbiguousSkills(missingSkills);

    // Explorer gap count must be 0
    assert.strictEqual(eligibleMissing.length, 0);

    // Ambiguity disclosure must retain R
    assert.strictEqual(ambiguousMissing.length, 1);
    assert.strictEqual(ambiguousMissing[0].skill_name, 'R');
  });

  test('regression: report with genuine missing skill and ambiguous requirement yields only genuine skill', () => {
    const missingSkills = [
      {
        skill_name: 'R',
        category: 'language',
        requirement_level: 'ambiguous',
        status: 'ambiguous_requirement',
        explanation: 'Ambiguous requirement level for R in job description.',
      },
      {
        skill_name: 'Docker',
        category: 'devops',
        requirement_level: 'required',
        status: 'missing_evidence',
        explanation: 'No verified evidence of Docker in profile.',
      },
    ];

    const eligibleMissing = getEligibleMissingSkills(missingSkills);
    const ambiguousMissing = getAmbiguousSkills(missingSkills);

    // Explorer gap count must be 1, containing only Docker
    assert.strictEqual(eligibleMissing.length, 1);
    assert.strictEqual(eligibleMissing[0].skill_name, 'Docker');
    assert.strictEqual(eligibleMissing[0].requirement_level, 'required');

    // Ambiguity disclosure must retain R
    assert.strictEqual(ambiguousMissing.length, 1);
    assert.strictEqual(ambiguousMissing[0].skill_name, 'R');
  });

  test('verified missing skills by level properly groups genuine skills and excludes ambiguous', () => {
    const missingSkills = [
      {
        skill_name: 'R',
        requirement_level: 'ambiguous',
        status: 'ambiguous_requirement',
        explanation: 'Ambiguous',
      },
      {
        skill_name: 'Docker',
        requirement_level: 'required',
        status: 'missing_evidence',
        explanation: 'Required missing',
      },
      {
        skill_name: 'Kubernetes',
        requirement_level: 'preferred',
        status: 'missing_evidence',
        explanation: 'Preferred missing',
      },
    ];

    const reqMissing = getVerifiedMissingSkillsByLevel(missingSkills, 'required');
    const prefMissing = getVerifiedMissingSkillsByLevel(missingSkills, 'preferred');

    assert.strictEqual(reqMissing.length, 1);
    assert.strictEqual(reqMissing[0].skill_name, 'Docker');

    assert.strictEqual(prefMissing.length, 1);
    assert.strictEqual(prefMissing[0].skill_name, 'Kubernetes');
  });
});
