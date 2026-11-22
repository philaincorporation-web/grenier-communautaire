import { CircleCheck, Info, LoaderCircle } from "lucide-react";
import type { FormState } from "@/lib/actions/public-forms";

export const initialFormState: FormState = { status: "idle" };

/** Valeur saisie à ré-afficher (React vide le formulaire après chaque envoi). */
export function saved(state: FormState, name: string): string | undefined {
  const v = state.values?.[name];
  return typeof v === "string" ? v : undefined;
}

export function savedList(state: FormState, name: string): string[] {
  const v = state.values?.[name];
  return Array.isArray(v) ? v : [];
}

const inputBase =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({
  label,
  name,
  error,
  required,
  hideLabel,
  as = "input",
  options,
  className = "",
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  const cls = `${inputBase} ${error ? "border-red-400" : "border-line"}`;
  const aria = { "aria-invalid": Boolean(error) || undefined, "aria-describedby": error ? `${id}-err` : undefined };
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-semibold text-ink"}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {as === "textarea" ? (
        <textarea id={id} name={name} required={required} rows={5} className={cls} placeholder={props.placeholder} defaultValue={props.defaultValue as string | undefined} {...aria} />
      ) : as === "select" ? (
        <select id={id} name={name} required={required} defaultValue={(props.defaultValue as string | undefined) ?? ""} className={cls} {...aria}>
          <option value="" disabled>
            {props.placeholder ?? "Choisir…"}
          </option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} name={name} required={required} className={cls} {...aria} {...props} />
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Champ piège invisible pour les robots (voir lib/actions/public-forms.ts). */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Site web <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  variant = "primary",
}: {
  pending: boolean;
  children: React.ReactNode;
  variant?: "primary" | "white";
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${
        variant === "primary" ? "bg-brand text-white hover:bg-brand-dark" : "bg-white text-brand hover:bg-brand-soft"
      }`}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormMessage({ state, light = false }: { state: FormState; light?: boolean }) {
  if (state.status === "idle" || !state.message) return null;
  const ok = state.status === "success";
  const Icon = ok ? CircleCheck : Info;
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm ${
        light
          ? "bg-white/15 text-white"
          : ok
            ? "bg-green-50 text-green-800"
            : "bg-red-50 text-red-700"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {state.message}
    </p>
  );
}
