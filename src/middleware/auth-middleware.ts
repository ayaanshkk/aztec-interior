import { NextResponse, type NextRequest } from "next/server";

export function authMiddleware(req: NextRequest) {
  // Auth is handled client-side by DashboardAuthGuard + AuthContext.
  // The cookie-based check caused users to be redirected to login even when
  // their session was valid in localStorage (cookie can expire or be missing
  // between visits while localStorage still holds a valid token).
  return NextResponse.next();
}