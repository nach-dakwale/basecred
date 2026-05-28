import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = authHeader.split(" ");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword && scheme?.toLowerCase() === "basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString();
    const colonIdx = decoded.indexOf(":");
    const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : "";
    if (pass === adminPassword) return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BaseCred Admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
