export type TopicStatus = 'not-started' | 'in-progress' | 'done';

export const TOPIC_STATUSES: TopicStatus[] = ['not-started', 'in-progress', 'done'];

export interface DisciplineTab {
  label: string;
  active: boolean;
}

export interface BeforeYouStartCard {
  colorLabel: string;
  title: string;
  bullets: string[];
}

export interface RoadmapMetadata {
  label?: string;
  subtitle?: string;
  metaPills?: string[];
  disciplines?: DisciplineTab[];
  timelinePace?: string;
  beforeYouStart?: BeforeYouStartCard[];
  quotes?: string[];
}

export interface GuidebookSummary {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  position: number;
  createdAt: Date;
  userId: string | null;
  topicCount: number;
  stageCount: number;
}

export interface StageRow {
  id: string;
  position: number;
  title: string;
  subtitle: string | null;
  byTheEnd: string | null;
  weekLabel: string | null;
  prerequisiteStage: number | null;
  checkpoints: CheckpointRow[];
}

export interface CheckpointRow {
  id: string;
  stageId: string;
  position: number;
  task: string;
  timeEstimate: string | null;
}

export interface TopicRow {
  id: string;
  title: string;
  description: string | null;
  position: number;
  stage: number | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  hasContent: boolean;
}

export interface GuidebookDetail {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  position: number;
  createdAt: Date;
  userId: string | null;
  metadata: RoadmapMetadata | null;
  stages: StageRow[];
  topics: TopicRow[];
}

export interface ProgressRow {
  topicId: string;
  status: TopicStatus;
}

export interface MarkdownUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
