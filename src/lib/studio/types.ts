/**
 * Trust Tai Studio — V1 domain types.
 *
 * Architecture: Truth -> Story -> Scenes -> Assets -> Formats -> Channels
 * Ownership:    Organization -> Studio -> Active World -> Story -> Outputs/Scenes -> Assets
 *
 * These mirror the tables in supabase/migrations. UI components must depend on
 * these types and the repository interfaces only — never on raw Supabase calls.
 */

export type UUID = string;
export type ISODate = string;

export type OutputFormat =
  | "linkedin_post"
  | "newsletter"
  | "blog_article"
  | "visual_story"
  | "cinematic_film";

export type StoryStatus = "drafting" | "in_production" | "ready_for_approval" | "live";

export type SourceKind = "text" | "voice_note" | "upload" | "suite_signal" | "link";

export type ApprovalDecision = "pending" | "approved" | "changes_requested";

export type FeedbackTarget = "world" | "story" | "scene" | "asset";

export interface Studio {
  id: UUID;
  organizationId: UUID | null;
  name: string;
  activeWorldId: UUID | null;
  createdAt: ISODate;
}

export interface World {
  id: UUID;
  studioId: UUID;
  name: string;
  subtitle: string | null;
  canonVersion: string;
  bible: Record<string, unknown> | null;
  createdAt: ISODate;
}

export interface Story {
  id: UUID;
  worldId: UUID;
  title: string;
  sourceTruth: string | null;
  deeperTruth: string | null;
  premise: string | null;
  whyItMatters: string | null;
  recommendedAngle: string | null;
  status: StoryStatus;
  createdAt: ISODate;
}

export interface StorySource {
  id: UUID;
  storyId: UUID;
  kind: SourceKind;
  content: string;
  createdAt: ISODate;
}

export interface StoryOutput {
  id: UUID;
  storyId: UUID;
  format: OutputFormat;
  status: StoryStatus;
  body: string | null;
  createdAt: ISODate;
}

export interface Scene {
  id: UUID;
  storyId: UUID;
  position: number;
  title: string;
  description: string | null;
  createdAt: ISODate;
}

export interface Asset {
  id: UUID;
  sceneId: UUID | null;
  storyId: UUID | null;
  kind: "image" | "video" | "audio";
  url: string | null;
  engine: string | null;
  createdAt: ISODate;
}

export interface Approval {
  id: UUID;
  storyId: UUID | null;
  storyOutputId: UUID | null;
  sceneId: UUID | null;
  decision: ApprovalDecision;
  note: string | null;
  createdAt: ISODate;
}

export interface CreativeFeedback {
  id: UUID;
  targetType: FeedbackTarget;
  targetId: UUID;
  note: string;
  createdAt: ISODate;
}

/** A locally-persisted Create draft, held until Studio AI is connected. */
export interface DraftSource {
  id: string;
  kind: SourceKind;
  content: string;
  savedAt: ISODate;
}
