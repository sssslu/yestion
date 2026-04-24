export interface Page {
  _id: string;
  title: string;
  emoji: string;
  content: unknown[];
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta extends Omit<Page, "content"> {}
