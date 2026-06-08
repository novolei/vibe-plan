import "server-only";

import { auth } from "@clerk/nextjs/server";

export async function requireUser() {
  const authContext = await auth();

  if (!authContext.userId) {
    throw new Error("Authentication required");
  }

  return authContext;
}

