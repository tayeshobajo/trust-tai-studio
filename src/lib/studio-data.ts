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
