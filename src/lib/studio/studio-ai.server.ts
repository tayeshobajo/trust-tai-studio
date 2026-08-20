/**
 * Studio AI — server-only creative brain.
 *
 * The provider is behind a narrow interface so it can be swapped without the
 * UI noticing. OPENAI_API_KEY is read inside the call, never at module scope,
 * never logged, and never exposed to the browser.
 */

import type {
  DirectorPlan,
  DirectorPlanRequest,
  ServiceResult,
  StoryDiscovery,
  StoryDiscoveryRequest,
} from "./ai-types";

export interface StudioAIProvider {
  readonly id: string;
  discoverStory(input: StoryDiscoveryRequest): Promise<ServiceResult<StoryDiscovery>>;
  planDirection(input: DirectorPlanRequest): Promise<ServiceResult<DirectorPlan>>;
}

const notConfigured = <T>(): ServiceResult<T> => ({
  ok: false,
  error: {
    code: "provider_not_configured",
    provider: "studio_ai",
    message:
      "Studio AI is ready to connect. Add the OPENAI_API_KEY server secret to enable analysis.",
  },
});

const providerError = <T>(message: string): ServiceResult<T> => ({
  ok: false,
  error: { code: "provider_error", provider: "studio_ai", message },
});

const worldPreamble = (world: StoryDiscoveryRequest["world"]) =>
  [
    `Active World: ${world.name} (canon ${world.canonVersion}).`,
    world.creativeRules?.length
      ? `Creative rules that must hold:\n- ${world.creativeRules.join("\n- ")}`
      : "No compiled creative rules yet; stay restrained, human, and non-promotional.",
  ].join("\n");

const DISCOVERY_SYSTEM = `You are Studio AI, the creative director of Trust Tai Studio.
You work down from what someone actually said to the human truth underneath it, then to a story worth telling.
Never flatter. Never write marketing language. Prefer the quiet, true observation over the clever one.
Respond with JSON only.`;

const DIRECTOR_SYSTEM = `You are Studio AI acting as film director for Trust Tai Studio.
You direct one continuous film, not isolated clips: continuity of character, wardrobe, light, and motion matters more than novelty.
Respond with JSON only.`;

async function callOpenAI(
  apiKey: string,
  system: string,
  user: string,
  schemaName: string,
  schema: Record<string, unknown>,
): Promise<ServiceResult<unknown>> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
      }),
    });
  } catch {
    return providerError("Studio AI could not be reached. Please try again.");
  }

  if (!response.ok) {
    // Provider bodies can echo request details; never surface or log them.
    return providerError(`Studio AI returned an error (status ${response.status}).`);
  }

  try {
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return providerError("Studio AI returned an empty response.");
    return { ok: true, data: JSON.parse(content) as unknown };
  } catch {
    return providerError("Studio AI returned a response Studio could not read.");
  }
}

const strictObject = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;

const discoverySchema = strictObject({
  title: str,
  sourceTruth: str,
  deeperHumanTruth: str,
  premise: str,
  whyItMatters: str,
  recommendedAngle: str,
  suggestedCreativeTreatment: str,
});

const sceneSchema = strictObject({
  sceneNumber: { type: "integer" },
  title: str,
  narrativePurpose: str,
  emotion: str,
  characterRefs: strArray,
  setting: str,
  cameraFraming: str,
  cameraMovement: str,
  lighting: str,
  wardrobe: str,
  props: strArray,
  composition: str,
  visualMetaphor: str,
  dialogue: { type: ["string", "null"] },
  narration: { type: ["string", "null"] },
  transitionIn: str,
  transitionOut: str,
  motionDirection: str,
  durationSeconds: { type: "number" },
  requiredAssetType: { type: "string", enum: ["image", "video", "audio"] },
  continuityNotes: str,
  directorNotes: str,
});

const directorSchema = strictObject({
  filmIntent: str,
  emotionalArc: str,
  visualArc: str,
  pacing: str,
  continuityRules: strArray,
  beats: {
    type: "array",
    items: strictObject({
      index: { type: "integer" },
      title: str,
      purpose: str,
      emotion: str,
      sceneNumbers: { type: "array", items: { type: "integer" } },
    }),
  },
  scenes: { type: "array", items: sceneSchema },
});

export const openAIStudioAIProvider: StudioAIProvider = {
  id: "openai",

  async discoverStory(input) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return notConfigured<StoryDiscovery>();
    if (!input.sourceText.trim()) {
      return {
        ok: false,
        error: {
          code: "invalid_input",
          provider: "studio_ai",
          message: "Add some source material before running Story Discovery.",
        },
      };
    }

    const user = [
      worldPreamble(input.world),
      input.requestedOutputs.length
        ? `Outputs the team is considering: ${input.requestedOutputs.join(", ")}.`
        : "No outputs chosen yet — understand the story first.",
      "Source material:",
      input.sourceText.trim(),
    ].join("\n\n");

    const result = await callOpenAI(
      apiKey,
      DISCOVERY_SYSTEM,
      user,
      "story_discovery",
      discoverySchema,
    );
    return result.ok
      ? { ok: true, data: result.data as StoryDiscovery }
      : (result as ServiceResult<StoryDiscovery>);
  },

  async planDirection(input) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return notConfigured<DirectorPlan>();

    const user = [
      worldPreamble(input.world),
      `Target film length: about ${input.targetDurationSeconds ?? 90} seconds.`,
      "Direct this story as one film. Story:",
      JSON.stringify(input.discovery, null, 2),
    ].join("\n\n");

    const result = await callOpenAI(
      apiKey,
      DIRECTOR_SYSTEM,
      user,
      "director_plan",
      directorSchema,
    );
    return result.ok
      ? { ok: true, data: result.data as DirectorPlan }
      : (result as ServiceResult<DirectorPlan>);
  },
};

/** Single swap point for the Studio AI brain. */
export const studioAI: StudioAIProvider = openAIStudioAIProvider;
