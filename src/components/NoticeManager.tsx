import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_NOTICES, fetchNotices, saveNotices, setNoticesEnabled, DEFAULT_DESCRIPTION_HEADING, fetchDescriptionHeading, saveDescriptionHeading, type NoticeItem, type NoticeSettings } from "@/lib/notices";

const newItem = (): NoticeItem => ({
  id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: "",
  text: "",
  link_url: "",
  link_label: "",
  is_active: true,
});

export function NoticeManager() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<NoticeSettings>(DEFAULT_NOTICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [descHeading, setDescHeading] = useState(DEFAULT_DESCRIPTION_HEADING);
  const [descSaving, setDescSaving] = useState(false);

  useEffect(() => {
    fetchDescriptionHeading().then(setDescHeading);
  }, []);

  const saveDescHeading = async () => {
    setDescSaving(true);
    try {
      await saveDescriptionHeading(descHeading);
      await qc.invalidateQueries({ queryKey: ["site", "description-heading"] });
      toast.success("Post note heading saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save heading");
    } finally {
      setDescSaving(false);
    }
  };

  useEffect(() => {
    fetchNotices().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateItem = (id: string, patch: Partial<NoticeItem>) =>
    setSettings((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const move = (index: number, dir: -1 | 1) =>
    setSettings((s) => {
      const items = [...s.items];
      const j = index + dir;
      if (j < 0 || j >= items.length) return s;
      [items[index], items[j]] = [items[j], items[index]];
      return { ...s, items };
    });

  const toggleEnabled = async (value: boolean) => {
    const previous = settings.is_enabled;
    setSettings((s) => ({ ...s, is_enabled: value }));
    try {
      await setNoticesEnabled(value);
      await qc.invalidateQueries({ queryKey: ["site", "notices"] });
      toast.success(value ? "Notice board ON" : "Notice board OFF");
    } catch (error) {
      console.error(error);
      setSettings((s) => ({ ...s, is_enabled: previous }));
      toast.error("Failed to update status");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveNotices(settings);
      await qc.invalidateQueries({ queryKey: ["site", "notices"] });
      toast.success("Notices saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save notices");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-5">
        <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${settings.is_enabled ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"}`}>
          <div>
            <h2 className="text-lg font-bold">Notice Board</h2>
            <p className="text-xs mt-1">
              <span className={settings.is_enabled ? "text-emerald-400 font-bold" : "text-white/50 font-bold"}>
                {settings.is_enabled ? "● ON — হোমপেজে দেখাচ্ছে" : "○ OFF — সাইটে দেখাচ্ছে না"}
              </span>
            </p>
            <p className="text-[11px] text-white/40 mt-1">Switch চাপলেই সাথে সাথে চালু/বন্ধ হবে (Save লাগবে না)।</p>
          </div>
          <Switch disabled={loading} checked={settings.is_enabled} onCheckedChange={toggleEnabled} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Headline</Label>
          <Input
            value={settings.headline}
            onChange={(e) => setSettings((s) => ({ ...s, headline: e.target.value }))}
            placeholder="নোটিশ"
            className="bg-black/30 border-white/10 h-10 text-xs"
          />
        </div>
      </div>

      {settings.items.map((item, index) => (
        <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Notice {index + 1}</span>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-2 mr-2">
                <span className="text-[11px] text-white/50">{item.is_active ? "Active" : "Hidden"}</span>
                <Switch checked={item.is_active} onCheckedChange={(v) => updateItem(item.id, { is_active: v })} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === settings.items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => setSettings((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }))}><Trash2 size={14} /></Button>
            </div>
          </div>
          <Input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} placeholder="Title (e.g. কিভাবে ডাউনলোড করব ও দেখব)" className="bg-black/30 border-white/10 h-10 text-xs" />
          <Textarea value={item.text} onChange={(e) => updateItem(item.id, { text: e.target.value })} placeholder="Notice text" rows={3} className="bg-black/30 border-white/10 text-xs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={item.link_url} onChange={(e) => updateItem(item.id, { link_url: e.target.value })} placeholder="Link (optional) https://..." className="bg-black/30 border-white/10 h-10 text-xs" />
            <Input value={item.link_label} onChange={(e) => updateItem(item.id, { link_label: e.target.value })} placeholder="Button text (optional)" className="bg-black/30 border-white/10 h-10 text-xs" />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => setSettings((s) => ({ ...s, items: [...s.items, newItem()] }))} className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold">
        <Plus size={14} className="mr-1" /> Add Notice
      </Button>

      <Button disabled={loading || saving} onClick={save} className="w-full bg-white text-black hover:bg-white/90 font-bold">
        {saving ? "Saving..." : "Save Notices"}
      </Button>

      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
        <div>
          <h2 className="text-lg font-bold">Post Description Box</h2>
          <p className="text-xs text-white/40 mt-1">প্রতিটি পোস্টের ডিসক্রিপশন বক্সের উপরের হেডিং (যেমন: নোট, গল্প, সারসংক্ষেপ)।</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Heading</Label>
          <Input value={descHeading} onChange={(e) => setDescHeading(e.target.value)} placeholder="নোট" className="bg-black/30 border-white/10 h-10 text-xs" />
        </div>
        <Button disabled={descSaving} onClick={saveDescHeading} className="w-full bg-white text-black hover:bg-white/90 font-bold">
          {descSaving ? "Saving..." : "Save Heading"}
        </Button>
      </div>
    </div>
  );
}
