import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetApiClientForTests, ApiError, getAccessToken, setAccessToken } from "./api-client";
import { esControlErrorMessage, requestEsControl } from "./es-control";

const settings = { mode: "POSTGRES", version: 2, updatedAt: null, updatedBy: null, elasticsearchConfigured: true };
const generic = "ES control không phản hồi, xem log server";
beforeEach(() => { __resetApiClientForTests(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { __resetApiClientForTests(); vi.unstubAllGlobals(); });
const respond = (data: unknown, status = 200) => vi.mocked(fetch).mockResolvedValue(Response.json(data, { status }));

async function failure(action: "status" | "start" | "stop" = "status") {
  await requestEsControl(action).then(
    () => { throw new Error("Expected request failure"); },
    reason => { expect(esControlErrorMessage(reason, false)).toBe(generic); },
  );
}

describe("ES control D11", () => {
  it("treats HTTP 200 success:false as an error, not successful status", async () => {
    respond({ success: false, exitCode: 1, output: "bridge dead" });
    await expect(requestEsControl("status")).rejects.toThrow("ES control unsuccessful");
  });
  it("keeps successful status output and GET method", async () => {
    respond({ success: true, exitCode: 0, output: "Elasticsearch running" });
    expect(await requestEsControl("status")).toEqual({ output: "Elasticsearch running" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/elasticsearch/status"), expect.objectContaining({ method: "GET" }));
  });
  it.each(["text/html", "text/plain"])('does not JSON-parse a Cloudflare 502 (%s)', async contentType => {
    setAccessToken("fixture-token");
    const response = new Response('<html>error code: 502 — Cloudflare</html>', { status: 502, statusText: "Bad Gateway", headers: { "content-type": contentType } });
    const parse = vi.spyOn(response, "json"); vi.mocked(fetch).mockResolvedValue(response);
    await failure(); expect(parse).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("fixture-token");
  });
  it("redacts JSON 502 backend details and returns localized guidance", async () => {
    respond({ detail: "Internal bridge failure with diagnostic secrets" }, 502);
    await failure("start");
    expect(esControlErrorMessage(new ApiError(502, { detail: "private diagnostic" }), true)).toBe("ES control is not responding; check server logs.");
  });
  it("handles malformed JSON and network failures without parser/raw transport messages", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("error code: 502", { headers: { "content-type": "application/json" } }));
    await failure(); vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch")); await failure();
  });
  it.each([null, {}, { success: "true" }])("rejects unacknowledged response %j", async data => {
    respond(data); await failure();
  });
  it("formats structured start output as text rather than a React object", async () => {
    respond({ success: true, exitCode: 0, output: { container: "running" }, settings: null });
    expect((await requestEsControl("start")).output).toBe('{\n  "container": "running"\n}');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/elasticsearch/start"), expect.objectContaining({ method: "POST" }));
  });
  it("reads stop settings from the current response envelope", async () => {
    respond({ success: true, output: { state: "stopped" }, settings });
    expect((await requestEsControl("stop")).settings).toEqual(settings);
  });
  it("supports the previous direct-settings stop contract", async () => {
    respond(settings); expect((await requestEsControl("stop")).settings).toEqual(settings);
  });
  it("never applies settings from a failed stop, even with legacy flat fields", async () => {
    respond({ ...settings, success: false }); await failure("stop");
    respond({ success: true, settings: null }); await failure("stop");
  });
  it("accepts application/problem+json error details", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ detail: "Admin access required" }), { status: 403, headers: { "content-type": "application/problem+json" } }));
    await expect(requestEsControl("status")).rejects.toMatchObject({ status: 403, message: "Admin access required" });
  });
  it("preserves permission errors instead of disguising them as a dead bridge", () => {
    expect(esControlErrorMessage(new ApiError(403, { detail: "Admin access required" }), false)).toBe("Admin access required");
  });
});
