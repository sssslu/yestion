"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePages } from "@/context/PagesContext";
import type { PageMeta } from "@/types";

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
  const [hovered, setHovered] = useState(false);

  const children = allPages.filter((p) => p.parentId === page._id);
  const isActive = pathname === `/page/${page._id}`;

  const handleNewChild = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = await createPage(page._id);
    setExpanded(true);
    router.push(`/page/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentId = pathname.startsWith("/page/") ? pathname.split("/page/")[1] : undefined;
    await deletePage(page._id, currentId);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md px-1 py-[3px] cursor-pointer select-none"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 토글 버튼 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded((v) => !v);
          }}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 shrink-0 transition-colors"
        >
          {children.length > 0 ? (
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 6 10"
            >
              <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>

        {/* 페이지 링크 */}
        <Link
          href={`/page/${page._id}`}
          className={`flex-1 flex items-center gap-2 rounded-md px-1 py-[2px] text-sm truncate transition-colors ${
            isActive
              ? "bg-gray-200 text-gray-900 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <span className="text-base leading-none">{page.emoji}</span>
          <span className="truncate">{page.title || "Untitled"}</span>
        </Link>

        {/* 호버 액션 */}
        <div
          className={`flex items-center gap-[2px] transition-opacity ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handleNewChild}
            title="하위 페이지 추가"
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            title="페이지 삭제"
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 하위 페이지 */}
      {expanded && children.length > 0 && (
        <div>
          {children
            .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
            .map((child) => (
              <PageItem key={child._id} page={child} allPages={allPages} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { pages, loading, createPage } = usePages();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const rootPages = pages.filter((p) => p.parentId === null);

  const handleNewPage = async () => {
    const id = await createPage(null);
    router.push(`/page/${id}`);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 h-full border-r border-gray-200 bg-[#f7f7f5] py-3 gap-2 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 transition-colors"
          title="사이드바 열기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60 h-full border-r border-gray-200 bg-[#f7f7f5] shrink-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-sm font-semibold text-gray-700 tracking-tight">Yestion</span>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 transition-colors"
          title="사이드바 접기"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 페이지 목록 */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-400">불러오는 중...</div>
        ) : rootPages.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400">페이지가 없습니다</div>
        ) : (
          rootPages
            .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
            .map((page) => (
              <PageItem key={page._id} page={page} allPages={pages} depth={0} />
            ))
        )}
      </div>

      {/* 새 페이지 버튼 */}
      <div className="px-2 pb-4 pt-1 border-t border-gray-200">
        <button
          onClick={handleNewPage}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 페이지
        </button>
      </div>
    </div>
  );
}
