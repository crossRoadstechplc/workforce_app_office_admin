import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query/query-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";
export const metadata={title:"Workforce Control",description:"Admin and CEO workforce portal"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><QueryProvider><AuthProvider><RealtimeProvider>{children}</RealtimeProvider></AuthProvider></QueryProvider><Toaster richColors position="top-right"/></body></html>}
