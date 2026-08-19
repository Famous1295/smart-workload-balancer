import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface MyProfile {
  id: string;
  full_name: string | null;
  semester: number | null;
  branch: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_opt_in: boolean;
}

export const profileQueryKey = ["my-profile"];

/** E.164, e.g. +919876543210 */
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export function useMyProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async (): Promise<MyProfile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, semester, branch, email, phone, whatsapp_opt_in")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as MyProfile | null) ?? null;
    },
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<MyProfile, "full_name" | "phone" | "whatsapp_opt_in">>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(input).eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: profileQueryKey });
      toast.success("Settings saved.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save settings."),
  });
}

export interface ReminderLogRow {
  id: string;
  task_id: string;
  channel: string;
  status: string;
  detail: string | null;
  sent_for_date: string;
  created_at: string;
}

export function useMyReminders() {
  return useQuery({
    queryKey: ["my-reminders"],
    queryFn: async (): Promise<ReminderLogRow[]> => {
      const { data, error } = await supabase
        .from("reminder_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ReminderLogRow[];
    },
  });
}
