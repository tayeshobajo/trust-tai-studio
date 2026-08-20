/**
 * Turns the Create flow's output selection into typed, plan-shaped generation
 * targets. The browser never composes a free-form provider prompt: every
 * request is a SceneDirection, exactly like a director-planned scene.
 */

import type { DirectorPlan, SceneDirection, StoryDiscovery, WorldContext } from "./ai-types";
import type { OutputFormat } from "./types";

/** Output formats that currently have a production engine behind them. */
export const producibleOutputs: OutputFormat[] = ["visual_story", "cinematic_film"];

function keyFrame(
  sceneNumber: number,
  discovery: StoryDiscovery,
  world: WorldContext,
  overrides: Partial<SceneDirection>,
): SceneDirection {
  return {
    sceneNumber,
    narrativePurpose: discovery.premise,
    emotion: discovery.deeperHumanTruth,
    characterRefs: [],
    setting: discovery.recommendedAngle,
    cameraFraming: "Editorial medium shot, 35mm, shallow depth of field",
    cameraMovement: "Locked off",
    lighting: "Warm natural light, deep shadow, cinematic contrast",
    wardrobe: "",
    props: [],
    composition: "Generous negative space, off-centre subject",
    visualMetaphor: discovery.suggestedCreativeTreatment,
    dialogue: null,
    narration: null,
    transitionIn: "Cut in",
    transitionOut: "Cut out",
    motionDirection: "Slow, restrained drift",
    durationSeconds: 5,
    requiredAssetType: "image",
    continuityNotes: `${world.name}, canon ${world.canonVersion}. No neon, no synthetic gradients.`,
    status: "ready_to_generate",
    ...overrides,
  };
}

/**
 * Builds the generation plan for the selected outputs. Cinematic film uses the
 * real Director Plan when one exists; visual story uses a single key frame.
 */
export function planForOutputs(input: {
  discovery: StoryDiscovery;
  world: WorldContext;
  selected: OutputFormat[];
  directorPlan: DirectorPlan | null;
}): DirectorPlan | null {
  const { discovery, world, selected, directorPlan } = input;

  if (selected.includes("cinematic_film") && directorPlan) return directorPlan;

  const scenes: SceneDirection[] = [];
  if (selected.includes("visual_story")) {
    scenes.push(keyFrame(1, discovery, world, {}));
  }
  if (selected.includes("cinematic_film")) {
    scenes.push(
      keyFrame(scenes.length + 1, discovery, world, {
        requiredAssetType: "video",
        narrativePurpose: `Opening shot — ${discovery.premise}`,
      }),
    );
  }
  if (!scenes.length) return null;

  return {
    filmIntent: discovery.whyItMatters,
    emotionalArc: discovery.deeperHumanTruth,
    visualArc: discovery.suggestedCreativeTreatment,
    pacing: "Unhurried, editorial",
    continuityRules: [`${world.name} canon ${world.canonVersion}`],
    beats: [],
    scenes,
  };
}
