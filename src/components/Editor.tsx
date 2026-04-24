"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useEffect, useRef } from "react";
import type { Block } from "@blocknote/core";

interface EditorProps {
  initialContent: unknown[];
  onChange: (blocks: Block[]) => void;
}

export default function Editor({ initialContent, onChange }: EditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0
        ? (initialContent as Block[])
        : undefined,
  });

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      onChangeRef.current(editor.document as Block[]);
    });
    return unsubscribe;
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="min-h-[400px]"
    />
  );
}
