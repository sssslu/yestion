"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePages } from "@/context/PagesContext";
import type { PageMeta } from "@/types";

function countDescendants(rootId: string, allPages: PageMeta[]): number {
  let count = 0;
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const p of allPages) {
      if (p.parentId === cur) {
        count += 1;
        stack.push(p._id);
      }
    }
  }
  return count;
}

function PageItem({
  page,
  allPages,
  depth,
}: {
  page: PageMeta;
  allPages: PageMeta[];
  depth: number;
}) {
  const pathname = usePathname();
  const { createPage, deletePage } = usePages();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [busy, setBusy] = useState(false);

  const children = allPages.filter((p) => p.parentId === page._id);
  const isActive = pathname === `/page/${page._id}`;

  const handleNewChild = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const id = await createPage(page._id);
      setExpanded(true);
      router.push(`/page/${id}`);
    } catch {
      alert("페이지 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const n = countDescendants(page._id, allPages);
    const label = page.title || "Untitled";
    const message =
      n > 0
        ? `"${label}" 페이지와 하위 페이지 ${n}개를 삭제할까요?\n되돌릴 수 없습니다.`
        : `"${label}" 페이지를 삭제할까요?\n되돌릴 수 없습니다.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      const currentId = pathname.startsWith("/page/")
        ? pathname.split("/page/")[1]
        : undefined;
      await deletePage(page._id, currentId);
    } catch {
      alert("페이지 삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <div
        className={`group flex items-center gap-0.5 rounded-md px-1 py-[3px] cursor-pointer select-none transition-colors ${
          isActive ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* 토글 버튼 (하위 페이지가 있을 때만) */}
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
            aria-label={expanded ? "하위 페이지 접기" : "하위 페이지 펼치기"}
            className="w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:bg-black/10 hover:text-stone-600 shrink-0 transition-colors"
          >
            <svg
              aria-hidden="true"
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 6 10"
            >
              <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" aria-hidden="true" />
        )}

        {/* 페이지 링크 */}
        <Link
          href={`/page/${page._id}`}
          className={`flex-1 min-w-0 flex items-center gap-2 rounded-md px-1 py-[2px] text-sm truncate ${
            isActive ? "text-[#37352f] font-medium" : "text-stone-600"
          }`}
        >
          <span className="text-base leading-none" aria-hidden="true">{page.emoji}</span>
          <span className="truncate">{page.title || "Untitled"}</span>
        </Link>

        {/* 호버 액션 (모바일: 항상 표시, 데스크톱: hover/키보드 포커스 시 표시) */}
        <div className="flex items-center gap-0.5 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button
            onClick={handleNewChild}
            disabled={busy}
            title="하위 페이지 추가"
            aria-label="하위 페이지 추가"
            className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:bg-black/10 hover:text-stone-700 disabled:opacity-50 transition-colors"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            title="페이지 삭제"
            aria-label="페이지 삭제"
            className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:bg-red-100 hover:text-red-500 disabled:opacity-50 transition-colors"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 하위 페이지 */}
      {expanded && children.length > 0 && (
        <ul>
          {children
            .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
            .map((child) => (
              <PageItem key={child._id} page={child} allPages={allPages} depth={depth + 1} />
            ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar() {
  const { pages, loading, error, refresh, createPage } = usePages();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false); // 데스크톱 전용
  const [mobileOpen, setMobileOpen] = useState(false); // 모바일 전용
  const [creating, setCreating] = useState(false);

  // 페이지 이동 시 모바일 사이드바 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape로 모바일 드로어 닫기
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const rootPages = pages.filter((p) => p.parentId === null);

  const handleNewPage = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createPage(null);
      router.push(`/page/${id}`);
    } catch {
      alert("페이지 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* 모바일 햄버거 버튼 (사이드바 닫혔을 때만) */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-1.5 left-3 z-40 md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-black/10 shadow-sm text-stone-600"
          title="메뉴 열기"
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
        >
          <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* 모바일 백드롭 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 패널 */}
      {/* 모바일: fixed 드로어 / 데스크톱: static flex 아이템 */}
      <aside
        className={[
          // 모바일: fixed 오버레이
          "fixed inset-y-0 left-0 z-50",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // 데스크톱: static, translate 초기화
          "md:static md:inset-auto md:z-auto md:translate-x-0",
          // 너비: 모바일 w-72, 데스크톱 collapsed 여부
          "w-72",
          collapsed ? "md:w-10" : "md:w-60",
          // 공통
          "h-full flex flex-col border-r border-black/[0.07] bg-[#f7f7f5] shrink-0",
        ].join(" ")}
      >
        {collapsed ? (
          /* 데스크톱 접힌 상태 (아이콘 바) */
          <div className="hidden md:flex flex-col items-center py-3 gap-2">
            <button
              onClick={() => setCollapsed(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:bg-black/5 hover:text-stone-600 transition-colors"
              title="사이드바 열기"
              aria-label="사이드바 열기"
              aria-expanded={false}
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          /* 펼쳐진 사이드바 */
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 pt-4 pb-2">
              <span className="text-sm font-semibold text-stone-700 tracking-tight">Yestion by Slu Park</span>
              <div className="flex items-center gap-1">
                {/* 모바일 닫기 버튼 */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:bg-black/10 transition-colors"
                  title="닫기"
                  aria-label="사이드바 닫기"
                >
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* 데스크톱 접기 버튼 */}
                <button
                  onClick={() => setCollapsed(true)}
                  className="hidden md:flex w-6 h-6 items-center justify-center rounded text-stone-400 hover:bg-black/10 transition-colors"
                  title="사이드바 접기"
                  aria-label="사이드바 접기"
                  aria-expanded={true}
                >
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 페이지 목록 */}
            <nav aria-label="페이지 목록" className="flex-1 overflow-y-auto px-1 py-1">
              {loading ? (
                <div className="px-2 py-1 space-y-1.5" aria-hidden="true">
                  <div className="h-6 w-[85%] rounded-md bg-black/[0.05] animate-pulse" />
                  <div className="h-6 w-[70%] rounded-md bg-black/[0.05] animate-pulse" />
                  <div className="h-6 w-[55%] rounded-md bg-black/[0.05] animate-pulse" />
                </div>
              ) : error ? (
                <div className="px-3 py-2 text-xs text-stone-500">
                  페이지를 불러오지 못했습니다
                  <button
                    onClick={() => refresh()}
                    className="ml-2 text-[#2383e2] hover:underline"
                  >
                    다시 시도
                  </button>
                </div>
              ) : rootPages.length === 0 ? (
                <button
                  onClick={handleNewPage}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-xs rounded-md text-stone-400 hover:text-stone-600 hover:bg-black/5 disabled:opacity-50 transition-colors"
                >
                  + 첫 페이지 만들기
                </button>
              ) : (
                <ul>
                  {rootPages
                    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
                    .map((page) => (
                      <PageItem key={page._id} page={page} allPages={pages} depth={0} />
                    ))}
                </ul>
              )}
            </nav>

            {/* 새 페이지 버튼 */}
            <div className="px-2 pb-4 pt-1 border-t border-black/[0.07]">
              <button
                onClick={handleNewPage}
                disabled={creating}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-stone-500 hover:bg-black/5 hover:text-stone-700 disabled:opacity-50 transition-colors"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 페이지
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
