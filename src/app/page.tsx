"use client";

import { usePages } from "@/context/PagesContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { pages, loading, createPage } = usePages();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (pages.length > 0) {
      // 루트 페이지 중 첫 번째로 이동
      const first = pages.filter((p) => p.parentId === null)[0] ?? pages[0];
      router.replace(`/page/${first._id}`);
    }
  }, [loading, pages, router]);

  const handleCreate = async () => {
    const id = await createPage(null);
    router.push(`/page/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <span className="text-6xl">📝</span>
      <h1 className="text-2xl font-semibold text-gray-800">Yestion에 오신 것을 환영합니다</h1>
      <p className="text-gray-500 text-sm">사이드바에서 새 페이지를 만들거나 아래 버튼을 눌러 시작하세요.</p>
      <button
        onClick={handleCreate}
        className="mt-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        새 페이지 만들기
      </button>
    </div>
  );
}

