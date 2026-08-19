import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { useAuditLog } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — Semester Balancer Admin" },
      { name: "description", content: "Read-only record of every administrative action." },
      { property: "og:title", content: "Audit Log — Semester Balancer Admin" },
      { property: "og:description", content: "Read-only record of every administrative action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const log = useAuditLog();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");

  const entries = log.data ?? [];
  const actions = useMemo(
    () => [...new Set(entries.map((e) => e.action_type))].sort(),
    [entries],
  );

  const filtered = entries.filter((e) => {
    const matchesAction = action === "all" || e.action_type === action;
    const needle = q.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      (e.admin_name ?? "").toLowerCase().includes(needle) ||
      (e.target ?? "").toLowerCase().includes(needle);
    return matchesAction && matchesQuery;
  });

  return (
    <AdminShell title="Audit Log">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search admin name or target…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card p-5 shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Timestamp</th>
              <th className="py-2">Admin</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
              <th className="py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-2 whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="py-2">{e.admin_name ?? "—"}</td>
                <td className="py-2">{e.action_type}</td>
                <td className="py-2">{e.target ?? "—"}</td>
                <td className="py-2 text-muted-foreground">{e.details ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">
                  No audit entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
