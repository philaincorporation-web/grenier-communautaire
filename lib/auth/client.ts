"use client";

import { createAuthClient } from "@neon/auth/next";

/** Client navigateur : passe par le proxy même origine /api/auth. */
export const authClient = createAuthClient();
