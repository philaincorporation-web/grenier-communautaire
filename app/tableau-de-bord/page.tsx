import { Suspense } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Box, CalendarDays, Check, Gift, Truck, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { loadDashboard } from "@/lib/queries";
import type { ImpactPoint, Kpi } from "@/lib/data";

const kpiIcons = { gift: Gift, box: Box, users: Users, truck: Truck };

const activityStyle = {
  don: { icon: Gift, cls: "bg-orange-100 text-orange-600" },
  approval: { icon: Check, cls: "bg-green-100 text-green-600" },
  distribution: { icon: Truck, cls: "bg-blue-100 text-blue-600" },
  member: { icon: Users, cls: "bg-brand-soft text-brand" },
};

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function niceMax(value: number) {
  if (value <= 10) return 10;
  const step = 10 ** Math.floor(Math.log10(value)) / 2;
  return Math.ceil(value / step) * step;
}

function ImpactChart({ series }: { series: ImpactPoint[] }) {
  const w = 320;
  const h = 160;
  const pad = { l: 28, r: 10, t: 10, b: 24 };
  const max = niceMax(Math.max(...series.map((p) => p.value)));
  const ticks = [0, max / 3, (2 * max) / 3, max].map(Math.round);
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (series.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Impact communautaire sur 4 semaines">
      <defs>
        <linearGradient id="impact" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b0124f" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#b0124f" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#e7e7ec" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#6b6f80">
            {v}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#impact)" />
      <path d={line} fill="none" stroke="#b0124f" strokeWidth="2" />
      {series.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r="3.5" fill="#b0124f">
            <title>{`${p.label} : ${p.value}`}</title>
          </circle>
          <text x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#6b6f80">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Trend({ value }: { value: Kpi["trend"] }) {
  if (value === null) return <p className="mt-1 h-4 text-xs text-muted">—</p>;
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className={`mt-1 flex h-4 items-center gap-1 text-xs font-semibold ${up ? "text-green-600" : "text-red-600"}`}>
      <Icon className="size-3" /> {up ? "+" : ""}
      {value}%
    </p>
  );
}

const card = "rounded-xl border border-line bg-white p-5 shadow-sm";

async function DashboardContent() {
  const { demo, kpis, activity, impact } = await loadDashboard();

  return (
    <>
      {demo && <DemoNotice />}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = kpiIcons[k.icon];
          return (
            <div key={k.label} className={card}>
              <Icon className="size-7 text-brand" />
              <p className="mt-3 text-sm text-muted">{k.label}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{fmt.format(k.value)}</p>
              <Trend value={k.trend} />
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Activité récente</h2>
            <Link href="/tableau-de-bord/rapports" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              Voir tout <ArrowRight className="size-3" />
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Aucune activité pour le moment.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {activity.map((a, i) => {
                const { icon: Icon, cls } = activityStyle[a.kind];
                return (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <span className={`grid size-9 place-items-center rounded-full ${cls}`}>
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-muted">{a.when}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={card}>
          <h2 className="font-bold">Impact communautaire</h2>
          <p className="text-xs text-muted">Bénéficiaires servis par semaine</p>
          <div className="mt-4">
            <ImpactChart series={impact} />
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 rounded-xl bg-white" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-white" />
        <div className="h-72 rounded-xl bg-white" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre organisation"
        action={
          <span className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium">
            <CalendarDays className="size-4" /> 30 derniers jours
          </span>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
