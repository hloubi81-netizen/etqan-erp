import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Youtube, X, Edit3, Plus, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const videoId = u.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (u.hostname === "youtu.be") {
      const videoId = u.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {}
  return null;
}

export default function TutorialButton() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [tutorial, setTutorial] = useState(null);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ youtube_url: "", title: "", description: "" });

  const currentPath = location.pathname;

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadTutorial = useCallback(async () => {
    if (!currentPath) return;
    setLoading(true);
    try {
      const tutorials = await base44.entities.PageTutorial.filter({ page_path: currentPath });
      if (tutorials && tutorials.length > 0) {
        setTutorial(tutorials[0]);
      } else {
        setTutorial(null);
      }
    } catch {
      setTutorial(null);
    }
    setLoading(false);
  }, [currentPath]);

  useEffect(() => {
    loadTutorial();
  }, [loadTutorial]);

  const handleOpen = () => {
    setEditMode(false);
    setOpen(true);
    if (tutorial) {
      setForm({
        youtube_url: tutorial.youtube_url || "",
        title: tutorial.title || "",
        description: tutorial.description || "",
      });
    } else {
      setForm({ youtube_url: "", title: "", description: "" });
    }
  };

  const handleSave = async () => {
    if (!form.youtube_url) return;
    setSaving(true);
    try {
      if (tutorial) {
        await base44.entities.PageTutorial.update(tutorial.id, {
          youtube_url: form.youtube_url,
          title: form.title,
          description: form.description,
          page_path: currentPath,
        });
      } else {
        await base44.entities.PageTutorial.create({
          page_path: currentPath,
          youtube_url: form.youtube_url,
          title: form.title,
          description: form.description,
        });
      }
      await loadTutorial();
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!tutorial) return;
    setSaving(true);
    try {
      await base44.entities.PageTutorial.delete(tutorial.id);
      setTutorial(null);
      setEditMode(false);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const isAdmin = user?.role === "admin";
  const embedUrl = tutorial ? getYouTubeEmbedUrl(tutorial.youtube_url) : null;
  const hasVideo = !!embedUrl;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        title="شرح الصفحة"
      >
        {hasVideo ? (
          <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
        ) : isAdmin ? (
          <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
        ) : (
          <Youtube className="h-5 w-5 group-hover:scale-110 transition-transform" />
        )}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <div className={`w-2.5 h-2.5 rounded-full ${hasVideo ? "bg-green-500" : "bg-gray-400"}`} />
        </span>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              {hasVideo && !editMode ? (tutorial?.title || "شرح الصفحة") : "شرح الصفحة"}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasVideo && !editMode ? (
            /* No video - show empty state */
            <div className="text-center py-8 space-y-4">
              <Youtube className="h-16 w-16 mx-auto text-gray-300" />
              <p className="text-muted-foreground">لا يوجد فيديو شرح لهذه الصفحة حالياً</p>
              {isAdmin && (
                <Button onClick={() => setEditMode(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة فيديو شرح
                </Button>
              )}
            </div>
          ) : editMode ? (
            /* Edit mode */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>رابط فيديو يوتيوب *</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>عنوان الشرح</Label>
                <Input
                  placeholder="مثال: شرح صفحة المنتجات"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>وصف مختصر</Label>
                <Textarea
                  placeholder="وصف بسيط لما يشرحه الفيديو..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                {tutorial && (
                  <Button variant="destructive" onClick={handleDelete} disabled={saving} size="sm">
                    حذف
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEditMode(false)} size="sm">
                  إلغاء
                </Button>
                <Button onClick={handleSave} disabled={saving || !form.youtube_url} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                  حفظ
                </Button>
              </div>
            </div>
          ) : (
            /* Watch mode */
            <div className="space-y-3 py-1">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={embedUrl}
                  title={tutorial?.title || "شرح الصفحة"}
                  className="absolute inset-0 w-full h-full rounded-lg"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              {tutorial?.description && (
                <p className="text-sm text-muted-foreground">{tutorial.description}</p>
              )}
              {isAdmin && (
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1">
                    <Edit3 className="h-3.5 w-3.5" />
                    تعديل الرابط
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}