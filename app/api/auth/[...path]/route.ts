import { getAuth, isAuthConfigured } from "@/lib/auth/server";

const notConfigured = () => Response.json({ error: "Neon Auth n'est pas configuré" }, { status: 503 });
const handlers = isAuthConfigured
  ? getAuth().handler()
  : { GET: notConfigured, POST: notConfigured, PUT: notConfigured, DELETE: notConfigured, PATCH: notConfigured };

export const { GET, POST, PUT, DELETE, PATCH } = handlers;
