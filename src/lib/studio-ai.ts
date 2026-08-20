/**
 * Studio AI — service boundary.
 *
 * One intelligence to the user. Internally it will orchestrate creative
 * direction (OpenAI) and production engines (Runway). Nothing is implemented
 * yet: these are the seams where real calls will land, behind server
 * functions so no API key ever reaches the browser.
 */

import type { OutputFormat } from "./studio-data";

export type SourceKind = "text" | "voice_note" | "upload" | "suite_signal" | "link";

export interface StorySource {
  kind: SourceKind;
  content: string;
}

export interface CreateStoryRequest {
  worldId: string;
  sources: StorySource[];
  intendedFormats?: OutputFormat[];
}

export interface CreateStoryResult {
  storyId: string;
  truth: string;
  angle: string;
}

/** Creative brain. Will call OpenAI from a server function. */
export async function createStory(_request: CreateStoryRequest): Promise<CreateStoryResult> {
  throw new Error("Studio AI is not connected yet.");
}

/** Production engine. Will call Runway from a server function. */
export async function renderAsset(_sceneId: string): Promise<never> {
  throw new Error("The production engine is not connected yet.");
}
