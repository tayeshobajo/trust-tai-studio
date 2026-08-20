/**
 * Studio domain model (client-side seed).
 *
 * Mirrors the future Supabase entities:
 *   organizations -> studios -> worlds -> stories -> story_sources
 *                                              -> story_outputs -> scenes -> assets
 *                                              -> approvals, creative_feedback
 *
 * Nothing here talks to a backend yet. When Lovable Cloud is enabled these
 * shapes become the row types and the seed below is replaced by queries.
 */

import storyMovement from "@/assets/story-movement.jpg";
import storyFounders from "@/assets/story-founders.jpg";
import storyRoadmap from "@/assets/story-roadmap.jpg";
import worldThumb from "@/assets/world-thumb.jpg";

export type OutputFormat =
  | "linkedin_post"
  | "newsletter"
  | "blog_article"
  | "visual_story"
  | "cinematic_film";

export type StoryStatus = "drafting" | "in_production" | "ready_for_approval" | "live";

export interface World {
  id: string;
  name: string;
  subtitle: string;
  canon: string;
  thumbnail: string;
}

export interface Story {
  id: string;
  title: string;
  premise: string;
  format: OutputFormat;
  status: StoryStatus;
  image: string;
  scenesReady?: number;
  scenesTotal?: number;
  updatedLabel: string;
}

export interface SuiteSignal {
  id: string;
  source: string;
  title: string;
  opportunity: string;
  room: "Projects" | "Roadmap" | "Comms" | "Steward";
}

export const activeWorld: World = {
  id: "world-trust-tai",
  name: "The Trust Tai World",
  subtitle: "World of Living Roads",
  canon: "Canon v1.0",
  thumbnail: worldThumb,
};

export const formatLabels: Record<OutputFormat, string> = {
  linkedin_post: "LinkedIn Post",
  newsletter: "Newsletter",
  blog_article: "Blog Article",
  visual_story: "Visual Story",
  cinematic_film: "Cinematic Film",
};

export const inProduction: Story[] = [
  {
    id: "story-movement",
    title: "Movement Is Not Progress",
    premise: "A cinematic story about mistaken movement and true progress.",
    format: "cinematic_film",
    status: "in_production",
    image: storyMovement,
    scenesReady: 5,
    scenesTotal: 7,
    updatedLabel: "Updated 2h ago",
  },
  {
    id: "story-founders",
    title: "What Founders Carry",
    premise: "A newsletter about the unseen weight carried by every builder.",
    format: "newsletter",
    status: "ready_for_approval",
    image: storyFounders,
    updatedLabel: "Updated 4h ago",
  },
  {
    id: "story-roadmap",
    title: "The Roadmap Perspective",
    premise: "Why perspective changes the system you are trying to build.",
    format: "blog_article",
    status: "drafting",
    image: storyRoadmap,
    updatedLabel: "Updated 1d ago",
  },
];

export const suiteSignals: SuiteSignal[] = [
  {
    id: "signal-project",
    source: "Completed Project",
    title: "Tai x Founder Workshop",
    opportunity: "Potential case study",
    room: "Projects",
  },
  {
    id: "signal-roadmap",
    source: "Roadmap Insight",
    title: "Roadmap Thinking v2",
    opportunity: "Potential thought leadership",
    room: "Roadmap",
  },
  {
    id: "signal-comms",
    source: "Recurring Question",
    title: "From Comms",
    opportunity: "Could become educational content",
    room: "Comms",
  },
  {
    id: "signal-steward",
    source: "Founder Insight",
    title: "From Steward",
    opportunity: "Powerful story opportunity",
    room: "Steward",
  },
];

export const nextMoves = [
  { id: "nm-1", label: "Finish scenes 6-7", context: "Movement Is Not Progress", done: true },
  { id: "nm-2", label: "Review newsletter draft", context: "What Founders Carry", done: false },
  { id: "nm-3", label: "Approve character look", context: "Founder Character Set", done: false },
];

/* ---------- Approvals ---------- */

export interface ApprovalItem {
  id: string;
  storyTitle: string;
  format: OutputFormat;
  image: string;
  submittedLabel: string;
  draft: string;
  directorNote: string;
  waitingOn: string;
}

export const approvals: ApprovalItem[] = [
  {
    id: "ap-founders",
    storyTitle: "What Founders Carry",
    format: "newsletter",
    image: storyFounders,
    submittedLabel: "Submitted 4h ago",
    draft:
      "Every founder carries a weight nobody sees. Not the pitch deck weight, or the runway weight — the quieter one: the belief that if they stop holding the whole thing, it falls. This issue is about setting that weight down without letting go of the work.",
    directorNote:
      "Studio AI: the angle lands on the second paragraph. Consider opening on the image of the unseen weight before naming the founder.",
    waitingOn: "Tone and opening line",
  },
  {
    id: "ap-movement-sc6",
    storyTitle: "Movement Is Not Progress — Scene 6",
    format: "cinematic_film",
    image: storyMovement,
    submittedLabel: "Submitted 6h ago",
    draft:
      "Scene 6. A road at dusk that keeps rebuilding itself under the traveller's feet. He is moving quickly and arriving nowhere. The camera stays still while the road works.",
    directorNote:
      "Studio AI: this scene carries the turn of the film. Recommend approving the composition before the production engine renders the remaining shots.",
    waitingOn: "Scene composition",
  },
  {
    id: "ap-character",
    storyTitle: "Founder Character Set",
    format: "visual_story",
    image: storyRoadmap,
    submittedLabel: "Submitted 1d ago",
    draft:
      "Three founder archetypes for the Trust Tai World: the Builder, the Steward, the Cartographer. Shared palette, shared light, distinct silhouettes.",
    directorNote:
      "Studio AI: the Cartographer drifts from Canon v1.0 lighting. Approve the other two, request changes on the third if the drift matters.",
    waitingOn: "Canon consistency",
  },
];

/* ---------- Library ---------- */

export type LibraryKind = "story" | "draft" | "asset";

export interface LibraryItem {
  id: string;
  title: string;
  kind: LibraryKind;
  format: OutputFormat;
  status: StoryStatus;
  image: string;
  updatedLabel: string;
  note: string;
}

export const libraryItems: LibraryItem[] = [
  {
    id: "lib-1",
    title: "Movement Is Not Progress",
    kind: "story",
    format: "cinematic_film",
    status: "in_production",
    image: storyMovement,
    updatedLabel: "2h ago",
    note: "5 of 7 scenes ready",
  },
  {
    id: "lib-2",
    title: "What Founders Carry",
    kind: "draft",
    format: "newsletter",
    status: "ready_for_approval",
    image: storyFounders,
    updatedLabel: "4h ago",
    note: "Awaiting your review",
  },
  {
    id: "lib-3",
    title: "The Roadmap Perspective",
    kind: "draft",
    format: "blog_article",
    status: "drafting",
    image: storyRoadmap,
    updatedLabel: "1d ago",
    note: "Angle being explored",
  },
  {
    id: "lib-4",
    title: "Founder Character Set",
    kind: "asset",
    format: "visual_story",
    status: "in_production",
    image: worldThumb,
    updatedLabel: "1d ago",
    note: "3 looks in progress",
  },
  {
    id: "lib-5",
    title: "Living Roads — Establishing Shot",
    kind: "asset",
    format: "cinematic_film",
    status: "live",
    image: storyMovement,
    updatedLabel: "3d ago",
    note: "Approved and in canon",
  },
  {
    id: "lib-6",
    title: "Tools Do Not Fix Systems",
    kind: "story",
    format: "linkedin_post",
    status: "live",
    image: storyRoadmap,
    updatedLabel: "5d ago",
    note: "Published to LinkedIn",
  },
];

export const statusLabels: Record<StoryStatus, string> = {
  drafting: "Drafting",
  in_production: "In Production",
  ready_for_approval: "Ready for approval",
  live: "Live",
};

/* ---------- World ---------- */

export const worldBible = [
  {
    id: "wb-truth",
    title: "Core Truth",
    body: "Movement is not progress. A system that keeps you busy is not a system that carries you forward.",
  },
  {
    id: "wb-voice",
    title: "Voice",
    body: "Calm, editorial, unhurried. Speaks to a founder as a peer, never as an audience.",
  },
  {
    id: "wb-laws",
    title: "Laws of the World",
    body: "Roads are alive. They rebuild under the traveller. Progress is measured by the ground that stays.",
  },
];

export const visualLanguage = [
  { id: "vl-1", label: "Ink", swatch: "var(--ink)", note: "Structure and type" },
  { id: "vl-2", label: "Paper", swatch: "var(--paper)", note: "Ground and rest" },
  { id: "vl-3", label: "Royal", swatch: "var(--royal)", note: "Signal and truth" },
  { id: "vl-4", label: "Royal Soft", swatch: "var(--royal-soft)", note: "Atmosphere" },
];

export const approvedScenes = [
  { id: "as-1", title: "The Road at Dusk", image: storyMovement, canon: "Canon v1.0" },
  { id: "as-2", title: "The Weight Carried", image: storyFounders, canon: "Canon v1.0" },
  { id: "as-3", title: "The Cartographer's Table", image: storyRoadmap, canon: "Canon v1.0" },
];
