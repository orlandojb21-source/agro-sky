"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90",
  secondary:
    "border border-green-200 text-green-900 hover:bg-green-50 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-950/40",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {pending ? "Guardando..." : children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <Link
      href={href}
      className={`inline-block rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </Link>
  );
}
