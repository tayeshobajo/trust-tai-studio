/**
 * Deterministic SceneDirection -> provider prompt compiler.
 *
 * Studio AI directs (it writes the SceneDirection); this module only *renders*
 * that direction into a provider prompt. It is pure and deterministic: the same
 * scene always compiles to the same string, and the user never types a provider
 * prompt by hand.
 */

import type { DirectorPlan, SceneDirection } from "./ai-types";

export interface SceneContext {
  scene: SceneDirection;
  previous?: SceneDirection | undefined;
  next?: SceneDirection | undefined;
  plan: DirectorPlan;
}

const clean = (value: string | null | undefined): string => (value ?? "").trim();

const clause = (label: string, value: string | null | undefined): string | null => {
  const v = clean(value);
  return v ? `${label}: ${v}` : null;
};

/** Builds the scene context (with transition neighbours) from a plan. */
export function sceneContext(plan: DirectorPlan, sceneNumber: number): SceneContext | null {
  const index = plan.scenes.findIndex((s) => s.sceneNumber === sceneNumber);
  if (index === -1) return null;
  return {
    scene: plan.scenes[index]!,
    previous: plan.scenes[index - 1],
    next: plan.scenes[index + 1],
    plan,
  };
}

/**
 * Storyboard still prompt. Ordered deliberately: subject and purpose first,
 * then camera, then light, then wardrobe/props, then composition and meaning,
 * then explicit continuity — providers weight earlier tokens more heavily.
 */
export function compileStoryboardPrompt(ctx: SceneContext): string {
  const { scene, previous, next, plan } = ctx;

  const continuity = [
    previous
      ? `Continues from scene ${previous.sceneNumber} (${clean(previous.transitionOut) || "cut"}), entering on ${clean(scene.transitionIn) || "a cut"}`
      : `Opening scene of the film, entering on ${clean(scene.transitionIn) || "a cut"}`,
    next
      ? `Leads into scene ${next.sceneNumber} via ${clean(scene.transitionOut) || "a cut"}`
      : `Final scene, closing on ${clean(scene.transitionOut) || "a cut"}`,
    clean(scene.continuityNotes),
    plan.continuityRules.length ? plan.continuityRules.join("; ") : "",
  ].filter(Boolean);

  return [
    `Cinematic storyboard still, scene ${scene.sceneNumber}.`,
    clause("Purpose", scene.narrativePurpose),
    clause("Setting", scene.setting),
    scene.characterRefs.length ? `Characters: ${scene.characterRefs.join(", ")}` : null,
    clause("Framing", scene.cameraFraming),
    clause("Camera movement implied", scene.cameraMovement),
    clause("Lighting", scene.lighting),
    clause("Wardrobe", scene.wardrobe),
    scene.props.length ? `Props: ${scene.props.join(", ")}` : null,
    clause("Composition", scene.composition),
    clause("Visual metaphor", scene.visualMetaphor),
    clause("Emotional register", scene.emotion),
    clause("Visual arc of the film", plan.visualArc),
    clause("Continuity", continuity.join(". ")),
    "No text, no captions, no logos, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Motion prompt for animating an approved storyboard still. Describes movement
 * only — the still already carries subject, light, and wardrobe.
 */
export function compileMotionPrompt(ctx: SceneContext): string {
  const { scene, plan } = ctx;
  return [
    `Animate this frame for scene ${scene.sceneNumber}.`,
    clause("Camera movement", scene.cameraMovement),
    clause("Subject motion", scene.motionDirection),
    clause("Emotional register", scene.emotion),
    clause("Ends on", scene.transitionOut),
    clause("Continuity", scene.continuityNotes),
    clause("Pacing", plan.pacing),
    "Hold the established framing, lighting, and wardrobe. No new characters, no text on screen.",
  ]
    .filter(Boolean)
    .join(" ");
}
