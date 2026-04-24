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
  refresh: () => Promise<void>;
  createPage: (parentId?: string | null) => Promise<string>;
  deletePage: (id: string, currentId?: string) => Promise<void>;
}

const PagesContext = createContext<PagesContextValue | null>(null);

export function PagesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPages();
      setPages(data);
    } catch (e) {
      console.error("Failed to load pages", e);
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
      await api.deletePage(id);
      await refresh();
      // 삭제된 페이지를 보고 있었다면 홈으로
      if (currentId === id) {
        router.push("/");
      }
    },
    [refresh, router]
  );

  return (
    <PagesContext.Provider value={{ pages, loading, refresh, createPage, deletePage }}>
      {children}
    </PagesContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PagesContext);
  if (!ctx) throw new Error("usePages must be used inside PagesProvider");
  return ctx;
}
