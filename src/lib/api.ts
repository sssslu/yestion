import axios from "axios";
import type { Page, PageMeta } from "@/types";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export const api = {
  getPages: (): Promise<PageMeta[]> =>
    API.get("/yestion/pages").then((r) => r.data),

  getPage: (id: string): Promise<Page> =>
    API.get(`/yestion/pages/${id}`).then((r) => r.data),

  createPage: (data: {
    title?: string;
    emoji?: string;
    parentId?: string | null;
  }): Promise<Page> => API.post("/yestion/pages", data).then((r) => r.data),

  updatePage: (
    id: string,
    data: Partial<Pick<Page, "title" | "emoji" | "content" | "parentId" | "order">>
  ): Promise<void> => API.patch(`/yestion/pages/${id}`, data).then(() => {}),

  deletePage: (id: string): Promise<{ deleted: number }> =>
    API.delete(`/yestion/pages/${id}`).then((r) => r.data),
};
