import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminUsers,
  useBranches,
  useToggleSuspend,
  useUpdateUser,
  type AdminUser,
  type AppRole,
} from "@/lib/admin";
import { adminCreateUser, adminDeleteUser, adminResetPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Admin" },
      { name: "description", content: "Create, edit, suspend and remove platform user accounts." },
      { property: "og:title", content: "User Management — Admin" },
      { property: "og:description", content: "Manage students, faculty and admin accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["student", "faculty", "admin"];

function UsersPage() {
  const qc = useQueryClient();
  const users = useAdminUsers();
  const branches = useBranches();
  const updateUser = useUpdateUser();
  const suspend = useToggleSuspend();
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const resetFn = useServerFn(adminResetPassword);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["audit-log"] });
  };

  const create = useMutation({
    mutationFn: (data: {
      full_name: string;
      email: string;
      password: string;
      role: AppRole;
      branch_id: string | null;
      semester: number | null;
    }) => createFn({ data }),
    onSuccess: () => {
      toast.success("User created");
      setAddOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("User deleted");
      setDeleting(null);
      setDeleteText("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (id: string) => resetFn({ data: { id } }),
    onSuccess: (result: { password: string }) => {
      setTempPassword(result.password);
      qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (branchFilter !== "all" && u.branch_id !== branchFilter) return false;
      if (!term) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [users.data, search, roleFilter, branchFilter]);

  return (
    <AdminShell
      title="User Management"
      actions={<Button onClick={() => setAddOpen(true)}>+ Add User</Button>}
    >
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branches.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3">{u.email ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">{u.branch ?? "—"}</td>
                <td className="px-4 py-3">{u.semester ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.status === "suspended"
                        ? "rounded-full bg-overloaded/15 px-2 py-0.5 text-xs font-medium text-overloaded"
                        : "rounded-full bg-safe/15 px-2 py-0.5 text-xs font-medium text-safe"
                    }
                  >
                    {u.status === "suspended" ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(u)} aria-label="Edit user">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Reset password"
                      onClick={() => reset.mutate(u.id)}
                    >
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={u.status === "suspended" ? "Reactivate user" : "Suspend user"}
                      onClick={() => suspend.mutate(u)}
                    >
                      {u.status === "suspended" ? (
                        <CheckCircle2 className="size-4 text-safe" />
                      ) : (
                        <Ban className="size-4 text-busy" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete user"
                      onClick={() => setDeleting(u)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted-foreground">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add user"
        branches={branches.data ?? []}
        withPassword
        pending={create.isPending}
        onSubmit={(values) =>
          create.mutate({
            full_name: values.full_name,
            email: values.email,
            password: values.password,
            role: values.role,
            branch_id: values.branch_id,
            semester: values.semester,
          })
        }
      />

      <UserFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit user"
        branches={branches.data ?? []}
        initial={editing}
        pending={updateUser.isPending}
        onSubmit={(values) => {
          if (!editing) return;
          updateUser.mutate(
            {
              id: editing.id,
              full_name: values.full_name,
              email: values.email,
              semester: values.semester,
              branch_id: values.branch_id,
              role: values.role,
            },
            {
              onSuccess: () => {
                toast.success("User updated");
                setEditing(null);
              },
              onError: (e: Error) => toast.error(e.message),
            },
          );
        }}
      />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && (setDeleting(null), setDeleteText(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this user and all their data. Type DELETE to confirm.
          </p>
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteText !== "DELETE" || remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tempPassword !== null} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share this with the user now — it is shown only once.
          </p>
          <code className="rounded-md bg-muted px-3 py-2 font-mono text-sm">{tempPassword}</code>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

interface FormValues {
  full_name: string;
  email: string;
  password: string;
  role: AppRole;
  branch_id: string | null;
  semester: number | null;
}

function UserFormDialog({
  open,
  onOpenChange,
  title,
  branches,
  initial,
  withPassword = false,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  branches: { id: string; name: string }[];
  initial?: AdminUser | null;
  withPassword?: boolean;
  pending: boolean;
  onSubmit: (values: FormValues) => void;
}) {
  const [values, setValues] = useState<FormValues>({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    branch_id: null,
    semester: null,
  });
  const [seeded, setSeeded] = useState<string | null>(null);

  const key = open ? (initial?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (open) {
      setValues({
        full_name: initial?.full_name ?? "",
        email: initial?.email ?? "",
        password: "",
        role: initial?.role ?? "student",
        branch_id: initial?.branch_id ?? null,
        semester: initial?.semester ?? null,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="u-name">Full name</Label>
            <Input
              id="u-name"
              required
              maxLength={100}
              value={values.full_name}
              onChange={(e) => setValues({ ...values, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              required
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>
          {withPassword && (
            <div className="space-y-2">
              <Label htmlFor="u-pass">Temporary password</Label>
              <Input
                id="u-pass"
                required
                minLength={8}
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={values.role}
                onValueChange={(v) => setValues({ ...values, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={values.branch_id ?? "none"}
                onValueChange={(v) => setValues({ ...values, branch_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select
                value={values.semester ? String(values.semester) : "none"}
                onValueChange={(v) =>
                  setValues({ ...values, semester: v === "none" ? null : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
