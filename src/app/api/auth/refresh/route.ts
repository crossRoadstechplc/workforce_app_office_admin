import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("workforce_refresh")?.value;
  if (!refreshToken) return NextResponse.json({ code:"NO_SESSION", message:"No active session" }, { status:401 });
  const response = await backendFetch("/auth/refresh", { method:"POST", body:JSON.stringify({refreshToken, deviceId:"admin-web"}) });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) { const out=NextResponse.json(data,{status:response.status}); out.cookies.delete("workforce_refresh"); return out; }
  const out=NextResponse.json({ accessToken:data.accessToken, mustChangePassword:data.mustChangePassword, user:data.user, activeContext:data.activeContext });
  out.cookies.set("workforce_refresh", data.refreshToken, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*30 });
  return out;
}
