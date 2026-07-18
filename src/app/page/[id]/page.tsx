"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import axios from "axios";
import { api } from "@/lib/api";
import { usePages } from "@/context/PagesContext";
import type { Page, PageMeta } from "@/types";
import type { Block } from "@blocknote/core";

// BlockNote is ESM-only; load dynamically to avoid SSR issues
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

type SaveState = "idle" | "saving" | "saved" | "error";
type LoadError = "notfound" | "network" | null;

const EMOJIS = [
  "📄","📝","📌","📎","🗒️","🗂️","📁","🔖","💡","⭐","🚀","🎯","🔥","✅","❓","🧠","📊","📋","🎨","🔧",
];

export default function PageView() {
  const { id } = useParams<{ id: string }>();
  const { pages, refresh } = usePages();

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<Block[] | null>(null);
  const pendingTitle = useRef<string | null>(null);
  const pendingEmoji = useRef<string | null>(null);
  const inFlight = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // 페이지 로드 + 이탈 시 미저장 내용 플러시
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(null);
    setLoadError(null);
    setSaveState("idle");
    api
      .getPage(id)
      .then((data) => {
        if (cancelled) return;
        setPage(data);
        setLoading(false);
        // 새(제목 없는) 페이지는 바로 제목 입력 가능하게
        if (!data.title) requestAnimationFrame(() => titleRef.current?.focus());
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(
          axios.isAxiosError(e) && e.response?.status === 404 ? "notfound" : "network"
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
      // 다른 페이지로 이동: 타이머 정리 + 이 페이지의 미저장 내용을 이 페이지 id로 즉시 저장
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      const patch: Partial<Pick<Page, "title" | "content" | "emoji">> = {};
      if (pendingContent.current !== null) patch.content = pendingContent.current;
      if (pendingTitle.current !== null) patch.title = pendingTitle.current;
      if (pendingEmoji.current !== null) patch.emoji = pendingEmoji.current;
      pendingContent.current = null;
      pendingTitle.current = null;
      pendingEmoji.current = null;
      if (Object.keys(patch).length > 0) {
        api.updatePage(id, patch).then(() => refresh()).catch(() => {});
      }
    };
  }, [id, retryKey, refresh]);

  // 미저장 상태에서 탭 닫기/새로고침 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        pendingContent.current !== null ||
        pendingTitle.current !== null ||
        pendingEmoji.current !== null ||
        inFlight.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // 브라우저 탭 제목을 현재 페이지와 동기화
  const pageEmoji = page?.emoji;
  const pageTitle = page?.title;
  useEffect(() => {
    if (pageEmoji === undefined) return;
    document.title = `${pageEmoji} ${pageTitle || "Untitled"} — Yestion`;
    return () => {
      document.title = "Yestion by Slu Park";
    };
  }, [pageEmoji, pageTitle]);

  // Escape로 이모지 피커 닫기 + 포커스 복귀
  useEffect(() => {
    if (!showEmojiPicker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        emojiBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showEmojiPicker]);

  // 즉시 저장 (디바운스 없이) — 재시도 버튼과 디바운스 만료 공용
  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const patch: Partial<Pick<Page, "title" | "content" | "emoji">> = {};
    if (pendingContent.current !== null) patch.content = pendingContent.current;
    if (pendingTitle.current !== null) patch.title = pendingTitle.current;
    if (pendingEmoji.current !== null) patch.emoji = pendingEmoji.current;
    if (Object.keys(patch).length === 0) {
      setSaveState("idle");
      return;
    }
    const sentContent = pendingContent.current;
    const sentTitle = pendingTitle.current;
    const sentEmoji = pendingEmoji.current;
    inFlight.current = true;
    setSaveState("saving");
    try {
      await api.updatePage(id, patch);
      // 저장 중 새 입력이 없었을 때만 pending 해제
      if (pendingContent.current === sentContent) pendingContent.current = null;
      if (pendingTitle.current === sentTitle) pendingTitle.current = null;
      if (pendingEmoji.current === sentEmoji) pendingEmoji.current = null;
      refresh(); // 사이드바 타이틀 갱신
      if (
        pendingContent.current === null &&
        pendingTitle.current === null &&
        pendingEmoji.current === null
      ) {
        setSaveState("saved");
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setSaveState("idle"), 2000);
      }
    } catch {
      setSaveState("error");
    } finally {
      inFlight.current = false;
    }
  }, [id, refresh]);

  // 자동 저장 (디바운스 800ms)
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      flushSave();
    }, 800);
  }, [flushSave]);

  const handleContentChange = useCallback(
    (blocks: Block[]) => {
      pendingContent.current = blocks;
      scheduleSave();
    },
    [scheduleSave]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPage((prev) => (prev ? { ...prev, title: value } : prev));
      pendingTitle.current = value;
      scheduleSave();
    },
    [scheduleSave]
  );

  // Enter/↓: 제목에서 에디터 본문으로 이동 (Notion 방식)
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      editorWrapRef.current
        ?.querySelector<HTMLElement>('[contenteditable="true"]')
        ?.focus();
    }
  };

  // 이모지도 저장 파이프라인에 태워 실패 시 '다시 시도'가 실제로 재전송되게 함
  const handleEmojiSelect = (emoji: string) => {
    setPage((p) => (p ? { ...p, emoji } : p));
    setShowEmojiPicker(false);
    emojiBtnRef.current?.focus();
    pendingEmoji.current = emoji;
    flushSave();
  };

  // 브레드크럼: 사이드바 메타데이터로 조상 체인 구성
  const ancestors = useMemo(() => {
    if (!page) return [] as PageMeta[];
    const byId = new Map<string, PageMeta>(pages.map((p) => [p._id, p]));
    const chain: PageMeta[] = [];
    const visited = new Set<string>();
    let cur = page.parentId;
    while (cur && byId.has(cur) && !visited.has(cur)) {
      visited.add(cur);
      const p = byId.get(cur)!;
      chain.unshift(p);
      cur = p.parentId;
    }
    return chain;
  }, [pages, page]);

  if (loading) {
    return (
      <div
        className="max-w-[720px] mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-32 animate-pulse"
        aria-hidden="true"
      >
        <div className="w-14 h-14 rounded-lg bg-black/[0.05]" />
        <div className="mt-6 h-10 w-2/3 rounded-md bg-black/[0.05]" />
        <div className="mt-10 space-y-3">
          <div className="h-4 rounded bg-black/[0.05]" />
          <div className="h-4 w-5/6 rounded bg-black/[0.05]" />
          <div className="h-4 w-3/6 rounded bg-black/[0.05]" />
        </div>
      </div>
    );
  }

  if (loadError === "network") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <span className="text-4xl" aria-hidden="true">⚠️</span>
        <p className="text-sm text-stone-500">
          페이지를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="px-4 py-2 text-sm rounded-md bg-[#2383e2] hover:bg-[#1b76cf] text-white font-medium transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm rounded-md text-stone-600 hover:bg-black/5 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <span className="text-4xl" aria-hidden="true">🔍</span>
        <p className="text-sm text-stone-500">
          페이지를 찾을 수 없습니다. 삭제되었거나 잘못된 주소일 수 있어요.
        </p>
        <Link
          href="/"
          className="px-4 py-2 text-sm rounded-md bg-[#2383e2] hover:bg-[#1b76cf] text-white font-medium transition-colors"
        >
          홈으로 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* 상단 바: 브레드크럼 + 저장 상태 */}
      <div className="sticky top-0 z-10 flex items-center h-12 pl-14 md:pl-8 pr-4 gap-2 bg-white/85 backdrop-blur-sm">
        <nav aria-label="페이지 경로" className="flex items-center gap-0.5 min-w-0 flex-1 text-sm">
          {ancestors.map((a) => (
            <span key={a._id} className="flex items-center gap-0.5 min-w-0 shrink">
              <Link
                href={`/page/${a._id}`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-stone-500 hover:bg-black/5 hover:text-stone-700 transition-colors min-w-0 max-w-40"
              >
                <span aria-hidden="true" className="shrink-0">{a.emoji}</span>
                <span className="truncate">{a.title || "Untitled"}</span>
              </Link>
              <span className="text-stone-300 shrink-0" aria-hidden="true">/</span>
            </span>
          ))}
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[#37352f] min-w-0 max-w-48">
            <span aria-hidden="true" className="shrink-0">{page.emoji}</span>
            <span className="truncate">{page.title || "Untitled"}</span>
          </span>
        </nav>

        <div role="status" aria-live="polite" className="shrink-0 flex items-center gap-2">
          {saveState === "error" ? (
            <>
              <span className="text-xs text-red-500">저장 실패</span>
              <button
                onClick={() => flushSave()}
                className="text-xs text-[#2383e2] hover:underline"
              >
                다시 시도
              </button>
            </>
          ) : (
            <span
              className={`text-xs text-stone-500 transition-opacity duration-300 ${
                saveState === "idle" ? "opacity-0" : "opacity-100"
              }`}
            >
              {saveState === "saving" ? "저장 중..." : "저장됨"}
            </span>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-[720px] w-full mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-32">
        {/* 이모지 */}
        <div className="relative mb-4">
          <button
            ref={emojiBtnRef}
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="text-5xl hover:bg-black/5 rounded-lg p-1 transition-colors leading-none"
            title="이모지 변경"
            aria-label="이모지 변경"
            aria-haspopup="dialog"
            aria-expanded={showEmojiPicker}
          >
            {page.emoji}
          </button>

          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowEmojiPicker(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="이모지 선택"
                className="absolute top-full left-0 z-20 mt-1 bg-white border border-black/10 rounded-xl shadow-lg p-3 grid grid-cols-5 gap-1"
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEmojiSelect(e)}
                    aria-label={`이모지 ${e}`}
                    className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 제목 */}
        <input
          ref={titleRef}
          type="text"
          value={page.title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          aria-label="페이지 제목"
          className="w-full text-3xl md:text-4xl font-bold text-[#37352f] bg-transparent border-none outline-none placeholder:text-stone-400 mb-6"
        />

        {/* 에디터 */}
        <div ref={editorWrapRef} className="md:-mx-[54px]">
          <Editor
            key={page._id}
            initialContent={page.content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
