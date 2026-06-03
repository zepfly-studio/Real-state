import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      tenantId: string | null;
      tenantName: string;
      avatarColor: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    tenantId: string | null;
    tenantName: string;
    avatarColor: string;
  }
}
