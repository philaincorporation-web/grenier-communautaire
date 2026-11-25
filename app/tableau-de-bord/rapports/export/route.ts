// Export CSV des rapports (séparateur « ; » et BOM UTF-8 pour une ouverture directe dans Excel).
// Ni nom ni contact : les bénéficiaires apparaissent par leur référence, les donateurs par leur type.

import { isDbConfigured } from "@/db";
import { canExportReports, DEFAULT_PERIOD, exportRows, isExportType, isPeriod } from "@/lib/reports";
import { requireActiveMembership } from "@/lib/session";

const cell = (v: string) => {
  // Neutralise les formules (=, +, -, @) et échappe les guillemets.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(request: Request) {
  if (!isDbConfigured) return new Response("Base de données non configurée.", { status: 503 });
  const member = await requireActiveMembership();
  if (!canExportReports(member.role)) return new Response("Accès réservé.", { status: 403 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const p = url.searchParams.get("periode");
  if (!isExportType(type)) return new Response("Type d'export inconnu.", { status: 400 });
  const period = isPeriod(p) ? p : DEFAULT_PERIOD;

  const rows = await exportRows(member.organizationId, period, type);
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville" }).format(new Date());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="grenier-${type}-${period}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
