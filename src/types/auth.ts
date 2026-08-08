export type AuthUser = { id: string; email: string; roles: string[]; permissions?: string[]; mustChangePassword?: boolean };
export type LoginResponse = { accessToken: string; mustChangePassword: boolean; user: AuthUser };
export type MeResponse = { id: string; email: string; mustChangePassword: boolean; roles: string[]; permissions: string[] };
