import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
export async function POST(request: NextRequest) {
  const refreshToken=request.cookies.get("workforce_refresh")?.value;
  const { accessToken } = await request.json().catch(()=>({accessToken:null}));
  if (refreshToken && accessToken) await backendFetch("/auth/logout", { method:"POST", headers:{authorization:`Bearer ${accessToken}`}, body:JSON.stringify({refreshToken}) }).catch(()=>null);
  const out=NextResponse.json({ ok:true }); out.cookies.delete("workforce_refresh"); return out;
}
