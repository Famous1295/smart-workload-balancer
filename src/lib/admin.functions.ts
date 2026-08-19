import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  full_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["student", "faculty", "admin"]),
  branch_id: z.string().uuid().nullable(),
  semester: z.number().int().min(1).max(8).nullable(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin role required");
}

async function writeAudit(
  supabase: any,
  userId: string,
  action_type: string,
  target: string | null,
  details: string | null,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  await supabase.from("audit_log").insert({
    admin_id: userId,
    admin_name: profile?.full_name ?? null,
    action_type,
    target,
    details,
  });
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let branchName: string | null = null;
    if (data.branch_id) {
      const { data: branch } = await supabaseAdmin
        .from("branches")
        .select("name")
        .eq("id", data.branch_id)
        .maybeSingle();
      branchName = branch?.name ?? null;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name: data.full_name,
      email: data.email,
      semester: data.semester,
      branch: branchName,
      branch_id: data.branch_id,
      status: "active",
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    await writeAudit(
      context.supabase,
      context.userId,
      "User Created",
      data.email,
      `Role: ${data.role}`,
    );
    return { id: created.user.id };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    await writeAudit(
      context.supabase,
      context.userId,
      "User Deleted",
      profile?.email ?? data.id,
      "All user data removed",
    );
    return { ok: true };
  });

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = generatePassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password });
    if (error) throw new Error(error.message);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    await writeAudit(
      context.supabase,
      context.userId,
      "Password Reset",
      profile?.email ?? data.id,
      "Temporary password issued",
    );
    return { password };
  });
