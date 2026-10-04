"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/locale";
import {
  describeClient,
  formatSeenAt,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type SessionInfo,
} from "@/lib/devices";

/**
 * Danh sách thiết bị đang đăng nhập + đăng xuất từng thiết bị / tất cả thiết bị khác.
 * Mỗi lần đăng nhập là một phiên riêng nên điện thoại và máy tính không đá nhau; mục này cho
 * người dùng quyền cắt một phiên cụ thể khi cần (ví dụ máy ở nơi khác).
 */
export default function SessionsPanel() {
  const { t, formatLocale } = useLocale();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const next = await listSessions(signal);
      if (signal?.aborted) return;
      setSessions(Array.isArray(next) ? next : []);
      setState("ready");
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : t("Không tải được danh sách thiết bị"));
      setState("error");
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleRevoke(session: SessionInfo) {
    if (busy) return;
    if (confirmId !== session.familyId) {
      setConfirmId(session.familyId);
      setConfirmAll(false);
      setMessage("");
      setError("");
      return;
    }
    setBusy(true);
    try {
      const result = await revokeSession(session.familyId);
      setConfirmId(null);
      setMessage(t(result.current ? "Đã đăng xuất thiết bị này" : "Đã đăng xuất thiết bị đã chọn"));
      if (result.current) {
        // Phiên hiện tại vừa bị cắt — tải lại trang để lớp bảo vệ phiên đưa về trang đăng nhập.
        window.location.assign("/login");
        return;
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Không đăng xuất được thiết bị"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeOthers() {
    if (busy) return;
    if (!confirmAll) {
      setConfirmAll(true);
      setConfirmId(null);
      setMessage("");
      setError("");
      return;
    }
    setBusy(true);
    try {
      const result = await revokeOtherSessions();
      setConfirmAll(false);
      setMessage(result.revoked > 0 ? t("Đã đăng xuất tất cả thiết bị khác") : t("Không có thiết bị nào khác đang đăng nhập"));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Không đăng xuất được thiết bị"));
    } finally {
      setBusy(false);
    }
  }

  const others = sessions.filter(session => !session.current).length;

  return <section className="kg-panel mt-6" aria-labelledby="sessions-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="sessions-heading" className="text-xl text-strong">{t("Thiết bị & phiên đăng nhập")}</h2>
        <p className="mt-1 text-sm text-subtle">{t("Bạn có thể đăng nhập song song trên nhiều thiết bị và đăng xuất từng thiết bị khi cần.")}</p>
      </div>
      {others > 0 && <button type="button" disabled={busy} onClick={() => void handleRevokeOthers()} className="kg-secondary min-h-11 px-4 text-sm">
        {confirmAll ? t("Bấm lần nữa để xác nhận") : t("Đăng xuất tất cả thiết bị khác")}
      </button>}
    </div>

    {message && <p role="status" className="mt-4 text-sm">{t(message)}</p>}
    {error && <p role="alert" className="mt-4 text-sm">{t(error)}</p>}
    {state === "loading" && <p role="status" className="mt-4 text-sm text-subtle">{t("Đang tải danh sách thiết bị…")}</p>}
    {state === "error" && <button type="button" onClick={() => void load()} className="kg-secondary mt-4">{t("Thử lại")}</button>}

    {state === "ready" && (sessions.length === 0
      ? <p className="mt-4 text-sm text-subtle">{t("Chưa có phiên nào đang hoạt động")}</p>
      : <ul className="mt-5 space-y-4">
        {sessions.map(session => {
          const client = describeClient(session.userAgent);
          const seen = formatSeenAt(session.lastSeenAt, formatLocale);
          return <li key={session.familyId} className="flex flex-wrap items-start justify-between gap-4 border-t border-line/70 pt-4 first:border-t-0 first:pt-0">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-strong">
                {client.device === "unknown" ? t("Không xác định được thiết bị") : client.device}
                {client.browser !== "unknown" && <span className="text-subtle">· {client.browser}</span>}
                {session.current && <span className="rounded-full bg-sage px-2 py-0.5 text-xs text-strong">{t("Thiết bị này")}</span>}
              </p>
              <p className="mt-1 text-xs text-subtle">
                {t("Đăng nhập gần nhất")}: {seen ?? "—"}
                {session.ipAddress ? ` · ${session.ipAddress}` : ""}
              </p>
            </div>
            <button type="button" disabled={busy} onClick={() => void handleRevoke(session)} className="kg-secondary min-h-11 px-4 text-sm">
              {confirmId === session.familyId ? t("Bấm lần nữa để xác nhận") : session.current ? t("Đăng xuất thiết bị này") : t("Đăng xuất")}
            </button>
          </li>;
        })}
      </ul>)}
  </section>;
}
