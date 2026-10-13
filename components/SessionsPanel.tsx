"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale";
import {
  formatSeenAt,
  groupSessions,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type SessionInfo,
  type SessionGroup,
} from "@/lib/devices";

/**
 * Danh sách phiên đăng nhập, gom theo thiết bị: đăng nhập lại nhiều lần trên cùng một trình duyệt
 * tạo ra nhiều phiên, nhưng chỉ chiếm một dòng — tránh màn hình đầy nút "Đăng xuất" giống nhau.
 * Đường cắt từng phiên vẫn còn trong phần chi tiết, cho trường hợp máy ở nơi khác.
 */
export default function SessionsPanel() {
  const { t, formatLocale } = useLocale();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [confirmFamily, setConfirmFamily] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const groups = useMemo(() => groupSessions(sessions), [sessions]);

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

  function clearPrompts() {
    setConfirmKey(null);
    setConfirmFamily(null);
    setConfirmAll(false);
    setMessage("");
    setError("");
  }

  function toggleExpanded(key: string) {
    setExpanded(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  }

  /** Đăng xuất cả nhóm: cắt mọi phiên của một thiết bị, gồm cả phiên đang mở trang này nếu có. */
  async function handleRevokeGroup(group: SessionGroup) {
    if (busy) return;
    if (confirmKey !== group.key) {
      clearPrompts();
      setConfirmKey(group.key);
      return;
    }
    setBusy(true);
    try {
      let revokedCurrent = false;
      for (const session of group.sessions) {
        const result = await revokeSession(session.familyId);
        revokedCurrent = revokedCurrent || result.current;
      }
      setConfirmKey(null);
      setMessage(t(revokedCurrent
        ? "Đã đăng xuất thiết bị này"
        : group.sessions.length > 1 ? "Đã đăng xuất tất cả phiên trên thiết bị này" : "Đã đăng xuất thiết bị đã chọn"));
      if (revokedCurrent) {
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

  async function handleRevokeOne(session: SessionInfo) {
    if (busy) return;
    if (confirmFamily !== session.familyId) {
      clearPrompts();
      setConfirmFamily(session.familyId);
      return;
    }
    setBusy(true);
    try {
      const result = await revokeSession(session.familyId);
      setConfirmFamily(null);
      setMessage(t(result.current ? "Đã đăng xuất thiết bị này" : "Đã đăng xuất thiết bị đã chọn"));
      if (result.current) {
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
      clearPrompts();
      setConfirmAll(true);
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
  const duplicates = groups.some(group => group.sessions.length > 1);

  return <section className="kg-panel mt-6" aria-labelledby="sessions-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="sessions-heading" className="text-xl text-strong">{t("Thiết bị & phiên đăng nhập")}</h2>
        <p className="mt-1 text-sm text-subtle">{t("Bạn có thể đăng nhập song song trên nhiều thiết bị và đăng xuất từng thiết bị khi cần.")}</p>
        {state === "ready" && sessions.length > 0 && (
          <p className="mt-2 text-xs text-subtle">
            {groups.length} {t("thiết bị")} · {sessions.length} {t("phiên đang mở")}
            {duplicates && <span> · {t("cùng thiết bị đăng nhập nhiều lần được gom lại.")}</span>}
          </p>
        )}
      </div>
      {others > 0 && <button type="button" disabled={busy} onClick={() => void handleRevokeOthers()} className="kg-secondary min-h-11 px-4 text-sm">
        {confirmAll ? t("Bấm lần nữa để xác nhận") : t("Đăng xuất tất cả thiết bị khác")}
      </button>}
    </div>

    {message && <p role="status" className="mt-4 text-sm">{t(message)}</p>}
    {error && <p role="alert" className="mt-4 text-sm">{t(error)}</p>}
    {state === "loading" && <p role="status" className="mt-4 text-sm text-subtle">{t("Đang tải danh sách thiết bị…")}</p>}
    {state === "error" && <button type="button" onClick={() => void load()} className="kg-secondary mt-4">{t("Thử lại")}</button>}

    {state === "ready" && (groups.length === 0
      ? <p className="mt-4 text-sm text-subtle">{t("Chưa có phiên nào đang hoạt động")}</p>
      : <ul className="mt-5 space-y-4">
        {groups.map(group => {
          const seen = formatSeenAt(group.lastSeenAt, formatLocale);
          const isOpen = expanded.includes(group.key);
          const many = group.sessions.length > 1;
          return <li key={group.key} className="border-t border-line/70 pt-4 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-strong">
                  {group.device === "unknown" ? t("Không xác định được thiết bị") : group.device}
                  {group.browser !== "unknown" && <span className="text-subtle">· {group.browser}</span>}
                  {group.current && <span className="rounded-full bg-sage px-2 py-0.5 text-xs text-strong">{t("Thiết bị này")}</span>}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {t("Đăng nhập gần nhất")}: {seen ?? "—"}
                  {group.ipAddress ? ` · ${group.ipAddress}` : ""}
                </p>
                {many && <p className="mt-1 text-xs text-subtle">
                  {group.sessions.length} {t("phiên trên thiết bị này")}
                  {group.unusedCount > 0 && <span> · {group.unusedCount} {t("phiên chưa dùng lần nào")}</span>}
                </p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {many && <button type="button" disabled={busy} onClick={() => toggleExpanded(group.key)} className="kg-secondary min-h-11 px-4 text-sm" aria-expanded={isOpen}>
                  {isOpen ? t("Ẩn các phiên") : t("Xem các phiên")}
                </button>}
                <button type="button" disabled={busy} onClick={() => void handleRevokeGroup(group)} className="kg-secondary min-h-11 px-4 text-sm">
                  {confirmKey === group.key
                    ? t("Bấm lần nữa để xác nhận")
                    : group.current
                      ? t("Đăng xuất thiết bị này")
                      : many ? `${t("Đăng xuất")} · ${group.sessions.length}` : t("Đăng xuất")}
                </button>
              </div>
            </div>

            {many && isOpen && <ul className="mt-4 space-y-3 border-l border-line/70 pl-4">
              {group.sessions.map(session => {
                const signedInAt = formatSeenAt(session.createdAt, formatLocale);
                const neverUsed = Math.abs(Date.parse(session.lastSeenAt) - Date.parse(session.createdAt)) < 60_000;
                return <li key={session.familyId} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-body">
                      {t("Đăng nhập lúc")}: {signedInAt ?? "—"}
                      {session.current && <span className="rounded-full bg-sage px-2 py-0.5 text-xs text-strong">{t("Đang dùng")}</span>}
                      {neverUsed && <span className="text-xs text-subtle">{t("Chưa dùng lần nào")}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {t("Đăng nhập gần nhất")}: {formatSeenAt(session.lastSeenAt, formatLocale) ?? "—"}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                    </p>
                  </div>
                  <button type="button" disabled={busy} onClick={() => void handleRevokeOne(session)} className="kg-secondary min-h-11 px-4 text-sm">
                    {confirmFamily === session.familyId ? t("Bấm lần nữa để xác nhận") : t("Đăng xuất")}
                  </button>
                </li>;
              })}
            </ul>}
          </li>;
        })}
      </ul>)}
  </section>;
}
