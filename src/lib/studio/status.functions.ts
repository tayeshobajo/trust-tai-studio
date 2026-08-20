/**
 * Server-function boundary for Studio AI status.
 *
 * Returns booleans and counts only — never credentials, never their values.
 */

import { createServerFn } from "@tanstack/react-start";

import type { ServiceResult } from "./ai-types";
import type { StudioAIProbe, StudioAIStatus } from "./status.server";

export const getStudioStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceResult<StudioAIStatus>> => {
    const { getStudioAIStatus } = await import("./status.server");
    return getStudioAIStatus();
  },
);

/** Runs one minimal live Discovery call to prove the brain is answering. */
export const runStudioAICheck = createServerFn({ method: "POST" }).handler(
  async (): Promise<ServiceResult<StudioAIProbe>> => {
    const { probeStudioAI } = await import("./status.server");
    return probeStudioAI();
  },
);
