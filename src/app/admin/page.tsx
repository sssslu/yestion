"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePages } from "@/context/PagesContext";
import { getEditLog, type EditLogEntry } from "@/lib/editLog";
import type { PageMeta } from "@/types";

// 로그 기록 시각과 서버 updatedAt이 이 이내로 맞으면 "이 브라우저에서 쓴 글"로 판정
const MATCH_TOLERANCE_MS = 60_000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "모름";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

function ipFor(page: PageMeta, log: Map<string, EditLogEntry>): string {
  const entry = log.get(page._id);
  if (!entry?.ip) return "모름";
  const gap = Math.abs(
    new Date(page.updatedAt).getTime() - new Date(entry.at).getTime()
  );
  // 마지막 저장이 이 브라우저가 아니면(시각이 어긋나면) 어디서 썼는지 알 수 없다
  return gap <= MATCH_TOLERANCE_MS ? entry.ip : "모름";
}

export default function AdminPage() {
  const { pages, loading, error, refresh } = usePages();
  const [myIp, setMyIp] = useState<string | null>(null);

  // 편집 로그는 페이지 진입 시점에 한 번만 읽으면 충분
  const log = useMemo(
    () => new Map(getEditLog().map((e) => [e.pageId, e])),
    []
  );

  useEffect(() => {
    document.title = "관리자 — Nonotion";
    return () => {
      document.title = "Nonotion by Slu Park";
    };
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMyIp(d?.ip ?? null))
      .catch(() => setMyIp(null));
  }, [refresh]);

  const recent = useMemo(
    () => [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [pages]
  );

  return (
    <div className="max-w-[840px] w-full mx-auto px-4 md:px-8 pt-16 md:pt-20 pb-24">
      <div className="flex items-center gap-3">
        <span className="text-4xl leading-none" aria-hidden="true">🔐</span>
        <h1 className="text-3xl md:text-4xl font-bold text-[#37352f]">관리자 페이지</h1>
      </div>
      <p className="mt-3 text-sm text-stone-500">
        최근에 쓰인 글과 쓴 시간, 쓴 곳 IP입니다. IP는 이 브라우저에서 저장한
        글만 알 수 있고, 알 수 없으면 <span className="font-medium">모름</span>으로 표시됩니다.
      </p>
      <p className="mt-1 text-xs text-stone-400">
        현재 접속 IP:{" "}
        <span className="font-mono">{myIp ?? "모름"}</span>
      </p>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-2 animate-pulse" aria-hidden="true">
            <div className="h-9 rounded-md bg-black/[0.05]" />
            <div className="h-9 rounded-md bg-black/[0.05]" />
            <div className="h-9 rounded-md bg-black/[0.05]" />
          </div>
        ) : error ? (
          <div className="text-sm text-stone-500">
            글 목록을 불러오지 못했습니다.
            <button
              onClick={() => refresh()}
              className="ml-2 text-[#2383e2] hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-stone-400">아직 쓰인 글이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/[0.07]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.07] bg-[#f7f7f5] text-left text-xs text-stone-500">
                  <th className="px-4 py-2.5 font-medium">글</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">쓴 시간</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">쓴 곳 IP</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((page) => (
                  <tr
                    key={page._id}
                    className="border-b border-black/[0.04] last:border-b-0 hover:bg-black/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/page/${page._id}`}
                        className="flex items-center gap-2 min-w-0 max-w-72 text-[#37352f] hover:underline"
                      >
                        <span aria-hidden="true" className="shrink-0">{page.emoji}</span>
                        <span className="truncate">{page.title || "Untitled"}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-stone-600">
                      {formatTime(page.updatedAt)}
                      <span className="ml-2 text-xs text-stone-400">
                        {relativeTime(page.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-stone-600">
                      {ipFor(page, log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
