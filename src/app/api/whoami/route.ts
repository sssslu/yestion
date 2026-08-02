// 접속자의 IP를 반환한다. 프록시/호스팅 헤더에 IP가 없으면 null.
export async function GET(request: Request) {
  const h = request.headers;
  const ip =
    h.get("x-nf-client-connection-ip") ?? // Netlify
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return Response.json({ ip: ip || null });
}
