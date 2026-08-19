import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const expiresAt = session?.expires_at;

    // No session, or the JWT has already expired -> back to login with a notice.
    if (!session || (expiresAt && expiresAt * 1000 <= Date.now())) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: session ? { expired: true } : {} });
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { expired: true } });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
