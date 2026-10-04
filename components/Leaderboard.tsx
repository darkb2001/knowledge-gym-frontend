"use client";
import { useState } from "react";
import { useLocale } from "@/components/locale";
import { topLeaderboard, type LeaderboardUser } from "@/lib/dashboard";

export default function Leaderboard({ users }: { users: LeaderboardUser[] }) {
  const { t, locale, formatLocale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const top = topLeaderboard(users);
  if (!top.length) return <p className="text-sm text-subtle">{t("Bảng xếp hạng sẽ hiện khi có người tích lũy XP.")}</p>;
  return <div data-leaderboard><p className="mb-3 text-xs text-subtle">{locale === "en" ? "Top learners by XP, up to 10 people." : "Nhóm dẫn đầu theo XP, tối đa 10 người."}</p><ol className="space-y-2">
    {top.slice(0, expanded ? 10 : 5).map(user => <li key={user.userId} className="flex items-center gap-3 rounded-sm border border-line px-3 py-2">
      <span className="w-8 shrink-0 text-center font-display text-warning">{user.rank}</span>
      <span className="min-w-0 flex-1 truncate" title={user.displayName}>{user.displayName}</span>
      <span className="shrink-0 text-sm tabular-nums text-positive">{user.xp.toLocaleString(formatLocale)} {t(" XP")}</span>
    </li>)}
  </ol>{top.length > 5 && <button type="button" className="kg-secondary mt-4" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{locale === "en" ? expanded ? "Show top 5" : "Show top 10" : expanded ? "Thu gọn top 5" : "Xem top 10"}</button>}</div>;
}
