"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PageMeta } from "@/types";

interface PagesContextValue {
  pages: PageMeta[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  createPage: (parentId?: string | null) => Promise<string>;
  deletePage: (id: string, currentId?: string) => Promise<void>;
}

const PagesContext = createContext<PagesContextValue | null>(null);

export function PagesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPages();
      setPages(data);
      setError(false);
    } catch (e) {
      console.error("Failed to load pages", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPage = useCallback(
    async (parentId: string | null = null): Promise<string> => {
      const page = await api.createPage({ parentId });
      await refresh();
      return page._id;
    },
    [refresh]
  );

  const deletePage = useCallback(
    async (id: string, currentId?: string) => {
      // 서버가 하위 페이지까지 연쇄 삭제하므로, 삭제될 전체 id 집합을 계산
      const removed = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of pages) {
          if (p.parentId && removed.has(p.parentId) && !removed.has(p._id)) {
            removed.add(p._id);
            grew = true;
          }
        }
      }

      // 서버 확인 후에 목록 제거·이동 (실패 시 UI가 어긋나지 않도록)
      await api.deletePage(id);
      setPages((prev) => prev.filter((p) => !removed.has(p._id)));
      // 보고 있던 페이지(또는 그 하위)가 삭제되면 홈으로
      if (currentId && removed.has(currentId)) {
        router.push("/");
      }
      await refresh();
    },
    [pages, refresh, router]
  );

  return (
    <PagesContext.Provider
      value={{ pages, loading, error, refresh, createPage, deletePage }}
    >
      {children}
    </PagesContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PagesContext);
  if (!ctx) throw new Error("usePages must be used inside PagesProvider");
  return ctx;
}
