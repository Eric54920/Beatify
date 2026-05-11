import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Track } from "@/types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from "@/store/player";
import { useT } from "@/lib/i18n";

interface Props {
  track: Track;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetadataEditor({ track, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const refreshLibrary = usePlayer((s) => s.refreshLibrary);
  const t = useT();

  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album);
  const [albumArtist, setAlbumArtist] = useState(track.album_artist ?? "");
  const [genre, setGenre] = useState(track.genre ?? "");
  const [year, setYear] = useState(track.year?.toString() ?? "");
  const [trackNumber, setTrackNumber] = useState(
    track.track_number?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.updateTrackMetadata(track.id, {
        title,
        artist,
        album,
        album_artist: albumArtist || undefined,
        genre: genre || undefined,
        year: year ? Number(year) : undefined,
        track_number: trackNumber ? Number(trackNumber) : undefined,
      });
      await refreshLibrary();
      toast({ title: t("action.save") });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("action.save"), description: e?.toString() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("dialog.editInfo.title")}</DialogTitle>
          <DialogDescription>
            {track.source === "local"
              ? t("dialog.editInfo.local")
              : t("dialog.editInfo.remote")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label={t("form.file")}>
            <Input
              value={fileNameFromUri(track.uri)}
              readOnly
              title={track.uri}
              className="cursor-text bg-foreground/[0.04] text-muted-foreground"
            />
          </Field>
          <Field label={t("form.title")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t("form.artist")}>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
          </Field>
          <Field label={t("form.album")}>
            <Input value={album} onChange={(e) => setAlbum(e.target.value)} />
          </Field>
          <Field label={t("form.albumArtist")}>
            <Input
              value={albumArtist}
              onChange={(e) => setAlbumArtist(e.target.value)}
            />
          </Field>
          <Field label={t("form.genre")}>
            <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.year")}>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </Field>
            <Field label={t("form.trackNumber")}>
              <Input
                type="number"
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? t("action.saving") : t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fileNameFromUri(uri: string): string {
  // Works for both local paths (separators / or \) and URLs (after stripping query/hash).
  try {
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      const u = new URL(uri);
      const segs = u.pathname.split("/").filter(Boolean);
      const last = segs.pop() ?? uri;
      return decodeURIComponent(last);
    }
  } catch {
    /* fall through */
  }
  const cleaned = uri.replace(/\\/g, "/");
  const idx = cleaned.lastIndexOf("/");
  return idx >= 0 ? cleaned.slice(idx + 1) : cleaned;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
