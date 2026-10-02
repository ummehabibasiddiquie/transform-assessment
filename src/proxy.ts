import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { authSecret } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/console")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("staff_session")?.value;
  let secret = "";
  try {
    secret = authSecret();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/console/:path*"],
};
