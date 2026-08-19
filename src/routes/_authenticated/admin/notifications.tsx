import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotificationSettings, useSaveNotificationSettings } from "@/lib/admin";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — Semester Balancer Admin" },
      { name: "description", content: "Configure platform-wide reminder and digest delivery." },
      { property: "og:title", content: "Notification Settings — Semester Balancer Admin" },
      {
        property: "og:description",
        content: "Configure platform-wide reminder and digest delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const settings = useNotificationSettings();
  const save = useSaveNotificationSettings();

  const [whatsapp, setWhatsapp] = useState(false);
  const [email, setEmail] = useState(true);
  const [dailyTime, setDailyTime] = useState("08:00");
  const [digestDay, setDigestDay] = useState(0);
  const [digestTime, setDigestTime] = useState("18:00");

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setWhatsapp(s.whatsapp_enabled);
    setEmail(s.email_digest_enabled);
    setDailyTime(s.daily_reminder_time.slice(0, 5));
    setDigestDay(s.weekly_digest_day);
    setDigestTime(s.weekly_digest_time.slice(0, 5));
  }, [settings.data]);

  async function onSave() {
    try {
      await save.mutateAsync({
        whatsapp_enabled: whatsapp,
        email_digest_enabled: email,
        daily_reminder_time: `${dailyTime}:00`,
        weekly_digest_day: digestDay,
        weekly_digest_time: `${digestTime}:00`,
      });
      toast.success("Notification settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  return (
    <AdminShell title="Notification Settings">
      <div className="max-w-2xl space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-sm font-medium">WhatsApp reminders</p>
              <p className="text-xs text-muted-foreground">Platform-wide deadline reminders.</p>
            </div>
            <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border py-2 pt-4">
            <div>
              <p className="text-sm font-medium">Email digest</p>
              <p className="text-xs text-muted-foreground">Weekly workload summary email.</p>
            </div>
            <Switch checked={email} onCheckedChange={setEmail} />
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="daily">Daily reminder time</Label>
            <Input
              id="daily"
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="digest-day">Weekly digest day</Label>
            <select
              id="digest-day"
              value={digestDay}
              onChange={(e) => setDigestDay(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="digest-time">Weekly digest time</Label>
            <Input
              id="digest-time"
              type="time"
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
            />
          </div>
        </section>

        <Button onClick={onSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </AdminShell>
  );
}
