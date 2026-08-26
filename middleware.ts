import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const role = request.cookies.get("user_role")?.value;
    const { pathname } = request.nextUrl;

    // Restrict /admin routes to ADMIN only
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Restrict /student routes to STUDENT only
    if (pathname.startsWith("/student") && role !== "STUDENT") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};