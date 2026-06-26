import { validateArtifactFile, type WorkBriefV1, type SkillManifestV1, type ArtifactValidationResult } from '@vibe-engineer/artifacts';

const result: ArtifactValidationResult<WorkBriefV1> = validateArtifactFile('/tmp/work-brief.json', { kind: 'work_brief' }) as ArtifactValidationResult<WorkBriefV1>;

if (result.ok) {
  const brief: WorkBriefV1 = result.artifact;
  const kind: 'work_brief' = brief.artifactKind;
  const skill: 'brainstorm' | 'grill-me' | 'task' = brief.sourceSkill;
  void kind;
  void skill;
}

const skillId: SkillManifestV1['skillId'] = 'build';
void skillId;
