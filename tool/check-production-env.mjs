const api=process.env.NEXT_PUBLIC_API_BASE_URL;const socket=process.env.NEXT_PUBLIC_SOCKET_BASE_URL;
if(!api||!socket){console.error("Production requires NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_SOCKET_BASE_URL");process.exit(1)}
for(const [name,value] of [["API",api],["Socket",socket]]){if(!String(value).startsWith("https://")){console.error(`${name} URL must use HTTPS in production: ${value}`);process.exit(1)}}
console.log("Production environment check passed.");
