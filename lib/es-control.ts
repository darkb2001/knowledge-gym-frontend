import { ApiError, apiRequest } from "./api-client";

export type SearchSettings = {
  mode: "POSTGRES" | "ELASTICSEARCH" | "AUTO";
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  elasticsearchConfigured: boolean;
};
export type EsAction = "status" | "start" | "stop";
export type EsControlResult = { output: string; settings?: SearchSettings };

function isSettings(value: unknown): value is SearchSettings {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.mode === "string" && ["POSTGRES", "ELASTICSEARCH", "AUTO"].includes(data.mode)
    && typeof data.version === "number" && Number.isFinite(data.version)
    && typeof data.elasticsearchConfigured === "boolean"
    && (data.updatedAt === null || typeof data.updatedAt === "string")
    && (data.updatedBy === null || typeof data.updatedBy === "string");
}

export async function requestEsControl(action: EsAction): Promise<EsControlResult> {
  const response = await apiRequest<unknown>(`/admin/search/elasticsearch/${action}`, { method: action === "status" ? "GET" : "POST" });
  // Older stop endpoints returned settings directly; the current endpoint wraps them.
  if (action === "stop" && isSettings(response) && !("success" in response)) return { output: "", settings: response };
  if (!response || typeof response !== "object" || !("success" in response) || response.success !== true) {
    throw new Error("ES control unsuccessful");
  }
  const data = response as Record<string, unknown>;
  // Acknowledging stop requires authoritative settings, not a guessed local mode.
  if (action === "stop" && !isSettings(data.settings)) throw new Error("ES stop settings unavailable");
  let output = "";
  if (typeof data.output === "string") output = data.output;
  else if (data.output != null) output = JSON.stringify(data.output, null, 2);
  const result: EsControlResult = { output };
  if (isSettings(data.settings)) result.settings = data.settings;
  return result;
}

export function esControlErrorMessage(reason: unknown, english: boolean): string {
  // Keep actionable permission/validation errors, but never display proxy HTML,
  // JSON parsing failures or transport/bridge internals as the user-facing error.
  if (reason instanceof ApiError && reason.status < 500) return reason.message;
  return english ? "ES control is not responding; check server logs." : "ES control không phản hồi, xem log server";
}
