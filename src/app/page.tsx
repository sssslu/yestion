"use client";

import { usePages } from "@/context/PagesContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { pages, loading, error, refresh, createPage } = usePages();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (pages.length > 0) {
      // 루트 페이지 중 첫 번째로 이동
      const first = pages.filter((p) => p.parentId === null)[0] ?? pages[0];
      router.replace(`/page/${first._id}`);
    }
  }, [loading, pages, router]);

  const handleCreate = async () => {
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

  // 로딩 중이거나 리다이렉트 대기 중 — 환영 화면 깜빡임 방지
  if (loading || pages.length > 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          role="status"
          aria-label="불러오는 중"
          className="w-5 h-5 rounded-full border-2 border-stone-200 border-t-stone-500 animate-spin"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <span className="text-4xl" aria-hidden="true">⚠️</span>
        <p className="text-sm text-stone-500">페이지 목록을 불러오지 못했습니다.</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 text-sm rounded-md bg-[#2383e2] hover:bg-[#1b76cf] text-white font-medium transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="text-5xl" aria-hidden="true">📝</span>
      <h1 className="mt-4 text-2xl font-semibold text-[#37352f]">
        Nonotion에 오신 것을 환영합니다
      </h1>
      <p className="mt-2 text-sm text-stone-500 max-w-sm">
        사이드바에서 새 페이지를 만들거나 아래 버튼을 눌러 시작하세요.
      </p>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="mt-6 px-4 py-2 bg-[#2383e2] hover:bg-[#1b76cf] disabled:opacity-60 text-white rounded-md text-sm font-medium transition-colors"
      >
        새 페이지 만들기
      </button>
    </div>
  );
}
