"use client";

import { useId, useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, Pencil, Plus, TriangleAlert, X } from "lucide-react";
import { addMember, saveCategory, saveProduct, setMemberActive, setProductActive, updateMemberRole, updateOrganization } from "@/lib/actions/settings";
import {
  roleDescriptions,
  roleLabels,
  UNIT_SUGGESTIONS,
  validateCategory,
  validateMember,
  validateOrganization,
  validateProduct,
  type CategoryInput,
  type FieldErrors,
  type MemberInput,
  type OrganizationInput,
  type ProductInput,
  type Role,
  type SettingsResult,
} from "@/lib/settings-shared";

const field = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface disabled:text-muted";
const labelCls = "mb-1.5 block text-sm font-semibold";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
const secondary = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:border-brand disabled:opacity-60";

/** État commun : validation locale, appel serveur, message de retour. */
function useAction() {
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const run = (local: FieldErrors, call: () => Promise<SettingsResult>, onOk?: () => void) => {
    setErrors(local);
    setResult(null);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      try {
        const r = await call();
        setResult(r);
        setErrors(r.ok ? {} : (r.errors ?? {}));
        if (r.ok) onOk?.();
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });
  };
  return { result, errors, pending, run, clear: () => (setResult(null), setErrors({})) };
}

function Notice({ result }: { result: SettingsResult | null }) {
  if (!result?.message) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
      {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      {result.message}
    </p>
  );
}

const FieldError = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs font-medium text-red-600">{msg}</p> : null);

// --- Organisation ---------------------------------------------------------------------------

export function OrganizationForm({ initial, readOnly }: { initial: OrganizationInput; readOnly: boolean }) {
  const [v, setV] = useState(initial);
  const { result, errors, pending, run } = useAction();
  const ids = useId();
  const set = (k: keyof OrganizationInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(validateOrganization(v), () => updateOrganization(v));
      }}
      className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6"
    >
      <Notice result={result} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor={`${ids}-n`} className={labelCls}>
            Nom de l&apos;organisation
          </label>
          <input id={`${ids}-n`} value={v.name} onChange={set("name")} disabled={readOnly} maxLength={180} className={field} />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label htmlFor={`${ids}-e`} className={labelCls}>
            E-mail de contact
          </label>
          <input id={`${ids}-e`} type="email" value={v.email} onChange={set("email")} disabled={readOnly} maxLength={255} className={field} />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label htmlFor={`${ids}-p`} className={labelCls}>
            Téléphone
          </label>
          <input id={`${ids}-p`} type="tel" value={v.phone} onChange={set("phone")} disabled={readOnly} maxLength={40} className={field} />
          <FieldError msg={errors.phone} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`${ids}-a`} className={labelCls}>
            Adresse
          </label>
          <textarea id={`${ids}-a`} value={v.address} onChange={set("address")} disabled={readOnly} rows={3} maxLength={1000} className={field} />
          <FieldError msg={errors.address} />
        </div>
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className={primary}>
            {pending && <LoaderCircle className="size-4 animate-spin" />} Enregistrer
          </button>
        </div>
      )}
    </form>
  );
}

// --- Catégories -----------------------------------------------------------------------------

type CategoryRow = { id: string; name: string; description: string | null; products: number };

function CategoryForm({ id, initial, onDone }: { id: string | null; initial: CategoryInput; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const { result, errors, pending, run } = useAction();
  const ids = useId();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(validateCategory(v), () => saveCategory(id, v), id ? onDone : () => setV({ name: "", description: "" }));
      }}
      className="space-y-3"
    >
      <Notice result={result} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start">
        <div>
          <label htmlFor={`${ids}-n`} className="sr-only">
            Nom
          </label>
          <input id={`${ids}-n`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Nom de la catégorie" maxLength={120} className={field} />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label htmlFor={`${ids}-d`} className="sr-only">
            Description
          </label>
          <input id={`${ids}-d`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="Description (facultatif)" maxLength={500} className={field} />
          <FieldError msg={errors.description} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : id ? null : <Plus className="size-4" />} {id ? "Enregistrer" : "Ajouter"}
          </button>
          {id && (
            <button type="button" onClick={onDone} className={secondary} aria-label="Annuler">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function CategoriesManager({ categories, readOnly }: { categories: CategoryRow[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">Nouvelle catégorie</h2>
          <CategoryForm id={null} initial={{ name: "", description: "" }} onDone={() => {}} />
        </div>
      )}
      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">Aucune catégorie pour le moment.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {categories.map((c) => (
            <li key={c.id} className="px-4 py-3">
              {editing === c.id ? (
                <CategoryForm id={c.id} initial={{ name: c.name, description: c.description ?? "" }} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.products} produit{c.products > 1 ? "s" : ""}
                      {c.description ? ` · ${c.description}` : ""}
                    </p>
                  </div>
                  {!readOnly && (
                    <button type="button" onClick={() => setEditing(c.id)} className={secondary}>
                      <Pencil className="size-4" /> Renommer
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Produits -------------------------------------------------------------------------------

type ProductRow = { id: string; name: string; sku: string | null; unit: string; categoryId: string | null; category: string | null; isPerishable: boolean; isActive: boolean };
const emptyProduct: ProductInput = { name: "", sku: "", unit: "", categoryId: "", isPerishable: false };

function ProductForm({ id, initial, categories, onDone }: { id: string | null; initial: ProductInput; categories: { id: string; name: string }[]; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const { result, errors, pending, run } = useAction();
  const ids = useId();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(validateProduct(v), () => saveProduct(id, v), id ? onDone : () => setV(emptyProduct));
      }}
      className="space-y-3"
    >
      <Notice result={result} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr]">
        <div>
          <label htmlFor={`${ids}-n`} className={labelCls}>
            Nom <span className="text-brand">*</span>
          </label>
          <input id={`${ids}-n`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={180} className={field} />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label htmlFor={`${ids}-u`} className={labelCls}>
            Unité <span className="text-brand">*</span>
          </label>
          <input id={`${ids}-u`} list={`${ids}-units`} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} maxLength={40} placeholder="kg, sac…" className={field} />
          <datalist id={`${ids}-units`}>
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FieldError msg={errors.unit} />
        </div>
        <div>
          <label htmlFor={`${ids}-s`} className={labelCls}>
            Code article
          </label>
          <input id={`${ids}-s`} value={v.sku} onChange={(e) => setV({ ...v, sku: e.target.value })} maxLength={80} className={`${field} uppercase`} />
          <FieldError msg={errors.sku} />
        </div>
        <div>
          <label htmlFor={`${ids}-c`} className={labelCls}>
            Catégorie
          </label>
          <select id={`${ids}-c`} value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })} className={field}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError msg={errors.categoryId} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.isPerishable} onChange={(e) => setV({ ...v, isPerishable: e.target.checked })} className="size-4 accent-brand" /> Denrée périssable
        </label>
        <div className="flex gap-2">
          {id && (
            <button type="button" onClick={onDone} className={secondary}>
              Annuler
            </button>
          )}
          <button type="submit" disabled={pending} className={primary}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : id ? null : <Plus className="size-4" />} {id ? "Enregistrer" : "Ajouter le produit"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ProductActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const { result, pending, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={() => run({}, () => setProductActive(id, !isActive))} className={`${secondary} ${isActive ? "text-red-700" : "text-green-700"}`}>
        {pending && <LoaderCircle className="size-4 animate-spin" />} {isActive ? "Retirer" : "Réactiver"}
      </button>
      {result && !result.ok && <p role="alert" className="max-w-64 text-right text-xs text-red-700">{result.message}</p>}
    </div>
  );
}

export function ProductsManager({ products, categories, readOnly }: { products: ProductRow[]; categories: { id: string; name: string }[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 font-bold">Nouveau produit</h2>
          <ProductForm id={null} initial={emptyProduct} categories={categories} onDone={() => {}} />
        </div>
      )}
      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">Le catalogue est vide.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {products.map((p) => (
            <li key={p.id} className={`px-4 py-3 ${p.isActive ? "" : "bg-surface/60"}`}>
              {editing === p.id ? (
                <ProductForm id={p.id} categories={categories} initial={{ name: p.name, sku: p.sku ?? "", unit: p.unit, categoryId: p.categoryId ?? "", isPerishable: p.isPerishable }} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold ${p.isActive ? "" : "text-muted line-through"}`}>{p.name}</p>
                    <p className="text-xs text-muted">
                      {[p.unit, p.category ?? "Sans catégorie", p.sku, p.isPerishable ? "périssable" : null, p.isActive ? null : "retiré du catalogue"].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex items-start gap-2">
                      {p.isActive && (
                        <button type="button" onClick={() => setEditing(p.id)} className={secondary}>
                          <Pencil className="size-4" /> Modifier
                        </button>
                      )}
                      <ProductActiveButton id={p.id} isActive={p.isActive} />
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Équipe ---------------------------------------------------------------------------------

type TeamRow = { id: string; name: string; email: string; role: Role; isActive: boolean; joinedAt: Date | string };

function AddMemberForm({ roles }: { roles: Role[] }) {
  const empty: MemberInput = { email: "", fullName: "", role: "member" };
  const [v, setV] = useState(empty);
  const { result, errors, pending, run } = useAction();
  const ids = useId();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(validateMember(v), () => addMember(v), () => setV(empty));
      }}
      className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 className="font-bold">Donner accès à une personne</h2>
      <Notice result={result} />
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_1fr]">
        <div>
          <label htmlFor={`${ids}-n`} className={labelCls}>
            Nom complet
          </label>
          <input id={`${ids}-n`} value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} maxLength={180} className={field} />
          <FieldError msg={errors.fullName} />
        </div>
        <div>
          <label htmlFor={`${ids}-e`} className={labelCls}>
            E-mail
          </label>
          <input id={`${ids}-e`} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} maxLength={255} className={field} />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label htmlFor={`${ids}-r`} className={labelCls}>
            Rôle
          </label>
          <select id={`${ids}-r`} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })} className={field}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
          <FieldError msg={errors.role} />
        </div>
      </div>
      <p className="text-xs text-muted">{roleDescriptions[v.role]} La personne crée ensuite son compte avec cette adresse e-mail.</p>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Ajouter à l&apos;équipe
        </button>
      </div>
    </form>
  );
}

function MemberControls({ member, roles }: { member: TeamRow; roles: Role[] }) {
  const { result, pending, run } = useAction();
  const ids = useId();
  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {member.isActive && (
          <>
            <label htmlFor={`${ids}-r`} className="sr-only">
              Rôle de {member.name}
            </label>
            <select id={`${ids}-r`} value={member.role} disabled={pending} onChange={(e) => run({}, () => updateMemberRole(member.id, e.target.value as Role))} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="button" disabled={pending} onClick={() => run({}, () => setMemberActive(member.id, !member.isActive))} className={`${secondary} ${member.isActive ? "text-red-700" : "text-green-700"}`}>
          {pending && <LoaderCircle className="size-4 animate-spin" />} {member.isActive ? "Désactiver" : "Réactiver"}
        </button>
      </div>
      {result?.message && (
        <p role={result.ok ? "status" : "alert"} className={`text-xs sm:text-right ${result.ok ? "text-green-700" : "text-red-700"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export function TeamManager({ team, selfId, actorRole, roles, readOnly }: { team: TeamRow[]; selfId: string; actorRole: Role; roles: Role[]; readOnly: boolean }) {
  return (
    <div className="space-y-4">
      {!readOnly && <AddMemberForm roles={roles} />}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {team.map((m) => {
          const editable = !readOnly && m.id !== selfId && (m.role !== "owner" || actorRole === "owner");
          return (
            <li key={m.id} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${m.isActive ? "" : "bg-surface/60"}`}>
              <div className="min-w-0">
                <p className="font-semibold">
                  {m.name}
                  {m.id === selfId && <span className="ml-2 text-xs font-medium text-muted">(vous)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {m.email} · {roleLabels[m.role]}
                  {m.isActive ? "" : " · accès désactivé"}
                </p>
              </div>
              {editable && <MemberControls member={m} roles={roles} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
