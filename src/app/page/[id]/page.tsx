"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { usePages } from "@/context/PagesContext";
import type { Page } from "@/types";
import type { Block } from "@blocknote/core";

// BlockNote is ESM-only; load dynamically to avoid SSR issues
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

type SaveState = "idle" | "saving" | "saved" | "error";

const EMOJIS = [
  "📄","📝","📌","📎","🗒️","🗂️","📁","🔖","💡","⭐","🚀","🎯","🔥","✅","❓","🧠","📊","📋","🎨","🔧",
];

export default function PageView() {
  const { id } = useParams<{ id: string }>();
  const { refresh } = usePages();

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<Block[] | null>(null);
  const pendingTitle = useRef<string | null>(null);

  // 페이지 로드
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(null);
    api.getPage(id).then((data) => {
      if (!cancelled) {
        setPage(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  // 자동 저장 (디바운스 800ms)
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const patch: Partial<Pick<Page, "title" | "content">> = {};
        if (pendingContent.current !== null) patch.content = pendingContent.current;
        if (pendingTitle.current !== null) patch.title = pendingTitle.current;
        if (Object.keys(patch).length === 0) { setSaveState("idle"); return; }
        await api.updatePage(id, patch);
        pendingContent.current = null;
        pendingTitle.current = null;
        setSaveState("saved");
        refresh(); // 사이드바 타이틀 갱신
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    }, 800);
  }, [id, refresh]);

  const handleContentChange = useCallback((blocks: Block[]) => {
    pendingContent.current = blocks;
    scheduleSave();
  }, [scheduleSave]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPage((prev) => prev ? { ...prev, title: value } : prev);
    pendingTitle.current = value;
    scheduleSave();
  }, [scheduleSave]);

  const handleEmojiSelect = async (emoji: string) => {
    setPage((prev) => prev ? { ...prev, emoji } : prev);
    setShowEmojiPicker(false);
    await api.updatePage(id, { emoji });
    refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        페이지를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 저장 상태 표시 */}
      <div className="absolute top-3 right-5 z-10">
        {saveState === "saving" && (
          <span className="text-xs text-gray-400">저장 중...</span>
        )}
        {saveState === "saved" && (
          <span className="text-xs text-green-500">저장됨</span>
        )}
        {saveState === "error" && (
          <span className="text-xs text-red-400">저장 실패</span>
        )}
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-[720px] mx-auto px-8 pt-16 pb-32">
        {/* 이모지 */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="text-5xl hover:bg-gray-100 rounded-lg p-1 transition-colors leading-none"
            title="이모지 변경"
          >
            {page.emoji}
          </button>

          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-5 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEmojiSelect(e)}
                    className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
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
          type="text"
          value={page.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 mb-6 resize-none"
        />

        {/* 에디터 */}
        <div className="-mx-[54px]">
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
