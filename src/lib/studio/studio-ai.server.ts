/**
 * Studio AI — server-only creative brain.
 *
 * The provider is behind a narrow interface so it can be swapped without the
 * UI noticing. OPENAI_API_KEY is read inside the call, never at module scope,
 * never logged, and never exposed to the browser.
 */

import type {
  AssetDirection,
  AssetDirectionRequest,
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
  /** First creative direction on a durable asset that already exists. */
  directAsset(input: AssetDirectionRequest): Promise<ServiceResult<AssetDirection>>;
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

const CREATIVE_PRINCIPLES = `Creative principles that govern every response:
- See the person before the problem.
- Find the deeper human truth, never a marketing angle.
- The audience is the hero; the guide reveals, it does not rescue.
- Movement is not automatically progress.
- Preserve dignity and agency; never make anyone a case study.
- Avoid generic AI phrasing, listicle cadence, and inspirational filler.
- Do not force World symbols into a story that does not need them.
- Do not package the lesson too early. Let the reader arrive.`;

const MENTAL_MODEL = `Studio's model is Truth -> Story -> Scenes -> Assets -> Formats -> Channels.
You are working at the Truth -> Story stage: your job is to understand, not to sell.`;

const DISCOVERY_SYSTEM = `You are Studio AI, the Creative Director and Story Editor of Trust Tai Studio.
You are not a copywriter. You work down from what someone actually said to the human truth underneath it, then to a story worth telling.
${MENTAL_MODEL}

${CREATIVE_PRINCIPLES}

Respond with JSON only.`;

const DIRECTOR_SYSTEM = `You are Studio AI acting as film director for Trust Tai Studio.
You direct ONE continuous film, not a set of unrelated clips.
Hold the whole film in mind: what the audience knows at each moment, what is withheld and when it is revealed, continuity of character, wardrobe, location and light, the direction of camera movement between scenes, visual rhythm, whether to cut or hold, and how Scene N earns Scene N+1.
${MENTAL_MODEL}

${CREATIVE_PRINCIPLES}

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

const assetDirectionSchema = strictObject({
  direction: str,
  whatWorks: str,
  whatToChange: str,
  nextShot: str,
});

const ASSET_DIRECTION_SYSTEM = `You are Studio AI, creative director of Trust Tai Studio, reviewing one piece of finished work.
See the person before the problem. Look for the deeper human truth, not a marketing angle. The audience is the hero; the guide reveals, it does not rescue.
Do not force World symbols into the frame, do not package the lesson early, and do not use generic AI phrasing.
Be concrete about craft: light, framing, wardrobe, continuity, rhythm, what the audience knows at this moment.
Respond with JSON only.`;


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

  async directAsset(input) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return notConfigured<AssetDirection>();

    const user = [
      worldPreamble(input.world),
      `Story: ${input.storyTitle ?? "Untitled"}${
        input.sceneNumber != null ? ` · Scene ${input.sceneNumber}` : ""
      } · ${input.assetType}.`,
      input.scenePrompt
        ? `The direction this frame was made from:\n${input.scenePrompt.slice(0, 2000)}`
        : "No scene direction was recorded for this frame.",
      input.priorFeedback.length
        ? `What the World has already learned here:\n- ${input.priorFeedback.slice(0, 6).join("\n- ")}`
        : "No creative memory exists for this frame yet.",
      "Give the first creative direction on this piece of work. Be specific and restrained; no praise, no marketing language.",
    ].join("\n\n");

    const result = await callOpenAI(
      apiKey,
      ASSET_DIRECTION_SYSTEM,
      user,
      "asset_direction",
      assetDirectionSchema,
    );
    return result.ok
      ? { ok: true, data: result.data as AssetDirection }
      : (result as ServiceResult<AssetDirection>);
  },
};

/** Single swap point for the Studio AI brain. */
export const studioAI: StudioAIProvider = openAIStudioAIProvider;
