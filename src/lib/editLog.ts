// 이 브라우저에서 저장(생성·수정)한 페이지의 마지막 기록(시간·IP)을 localStorage에 남긴다.
// 외부 API 서버는 IP를 저장하지 않으므로, 다른 기기/브라우저에서 쓴 글의 IP는 알 수 없다.

export interface EditLogEntry {
  pageId: string;
  at: string; // ISO 시각
  ip: string | null;
}

const KEY = "nonotion:editlog";
const MAX_ENTRIES = 500;

let ipPromise: Promise<string | null> | null = null;

function fetchMyIp(): Promise<string | null> {
  if (!ipPromise) {
    ipPromise = fetch("/api/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ip ?? null)
      .catch(() => {
        ipPromise = null; // 실패하면 다음 저장 때 다시 시도
        return null;
      });
  }
  return ipPromise;
}

export function getEditLog(): EditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function logWrite(pageId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const at = new Date().toISOString(); // IP 조회를 기다리는 동안 시각이 밀리지 않게 먼저 기록
  const ip = await fetchMyIp();
  try {
    const entries = getEditLog().filter((e) => e.pageId !== pageId);
    entries.push({ pageId, at, ip });
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // 저장 실패(사생활 모드 등)는 무시 — 관리자 페이지에 '모름'으로 표시될 뿐
  }
}
