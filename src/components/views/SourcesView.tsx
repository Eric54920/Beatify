import { useState, useEffect } from "react";
import {
  Folder,
  Trash2,
  RefreshCw,
  Plus,
  Globe,
  HardDrive,
  Cloud,
  Activity,
  Pencil,
} from "lucide-react";
import type { RemoteSource } from "@/types";
import { SpeedTestDialog } from "@/components/SpeedTestDialog";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlayer } from "@/store/player";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/lib/i18n";

export function SourcesView() {
  const t = useT();
  const folders = usePlayer((s) => s.folders);
  const remoteSources = usePlayer((s) => s.remoteSources);
  const tracks = usePlayer((s) => s.tracks);
  const { toast } = useToast();
  const confirm = useConfirm();
  const [webdavOpen, setWebdavOpen] = useState(false);
  const [editing, setEditing] = useState<RemoteSource | null>(null);
  const [scanning, setScanning] = useState<number | "all" | null>(null);
  const [speedTest, setSpeedTest] = useState<{
    open: boolean;
    title: string;
    folderPath?: string;
    sourceId?: number;
  }>({ open: false, title: "" });

  const onAddFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        await api.addLocalFolder(selected);
        toast({ title: t("action.addFolder"), description: selected });
      }
    } catch (e: any) {
      toast({ title: t("action.addFolder"), description: e?.toString() });
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("page.sources.title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("page.sources.subtitle", {
              folders: folders.length,
              servers: remoteSources.length,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onAddFolder}
          >
            <Plus className="h-4 w-4" /> {t("action.addFolder")}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="rounded-full"
            onClick={() => setWebdavOpen(true)}
          >
            <Globe className="h-4 w-4" /> {t("action.addWebdav")}
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-6">
        <Section title={t("page.sources.localFolders")} icon={HardDrive}>
          {folders.length === 0 && (
            <EmptyHint text={t("page.sources.emptyFolders")} />
          )}
          {folders.map((f) => {
            const count = tracks.filter(
              (tr) => tr.source === "local" && tr.uri.startsWith(f.path)
            ).length;
            return (
              <SourceCard
                key={f.id}
                title={f.path.split("/").filter(Boolean).pop() ?? f.path}
                subtitle={f.path}
                meta={t("page.albums.trackCount", { n: count })}
                added={f.added_at}
                addedLabel={t("page.sources.added", {
                  date: new Date(f.added_at).toLocaleDateString(),
                })}
                actionIcon={<Activity className="h-4 w-4" />}
                actionTitle={t("speedtest.title")}
                onAction={() =>
                  setSpeedTest({
                    open: true,
                    title: f.path.split("/").filter(Boolean).pop() ?? f.path,
                    folderPath: f.path,
                  })
                }
                onRemove={async () => {
                  const ok = await confirm({
                    title: t("confirm.removeFolder.title"),
                    description: t("confirm.removeFolder.description", { n: count }),
                    confirmText: t("action.remove"),
                    destructive: true,
                  });
                  if (!ok) return;
                  await api.removeFolder(f.id);
                  toast({ title: t("action.remove") });
                }}
              />
            );
          })}
        </Section>

        <Section
          title={t("page.sources.remote")}
          icon={Cloud}
          className="mt-8"
        >
          {remoteSources.length === 0 && (
            <EmptyHint text={t("page.sources.emptyRemote")} />
          )}
          {remoteSources.map((s) => {
            const count = tracks.filter((tr) => tr.source_id === s.id).length;
            return (
              <SourceCard
                key={s.id}
                title={s.name}
                subtitle={s.url}
                meta={`${t("page.albums.trackCount", { n: count })}${
                  s.username ? ` · ${s.username}` : ""
                }`}
                added={s.added_at}
                addedLabel={t("page.sources.added", {
                  date: new Date(s.added_at).toLocaleDateString(),
                })}
                actionIcon={<Pencil className="h-4 w-4" />}
                actionTitle={t("action.editWebdav")}
                onAction={() => setEditing(s)}
                action3Icon={<Activity className="h-4 w-4" />}
                action3Title={t("speedtest.title")}
                onAction3={() =>
                  setSpeedTest({ open: true, title: s.name, sourceId: s.id })
                }
                action2Icon={
                  <RefreshCw
                    className={`h-4 w-4 ${scanning === s.id ? "animate-spin" : ""}`}
                  />
                }
                action2Title={t("action.sync")}
                onAction2={async () => {
                  setScanning(s.id);
                  try {
                    const n = await api.syncRemoteSource(s.id);
                    toast({
                      title: t("action.sync"),
                      description: `${n}`,
                    });
                  } catch (e: any) {
                    toast({
                      title: t("action.sync"),
                      description: e?.toString(),
                    });
                  } finally {
                    setScanning(null);
                  }
                }}
                onRemove={async () => {
                  const ok = await confirm({
                    title: t("confirm.removeRemote.title"),
                    description: t("confirm.removeRemote.description", { n: count }),
                    confirmText: t("action.remove"),
                    destructive: true,
                  });
                  if (!ok) return;
                  await api.removeRemoteSource(s.id);
                  toast({ title: t("action.remove") });
                }}
              />
            );
          })}
        </Section>
      </div>

      <WebdavDialog open={webdavOpen} onOpenChange={setWebdavOpen} />
      <WebdavEditDialog
        source={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
      />
      <SpeedTestDialog
        open={speedTest.open}
        onOpenChange={(o) => setSpeedTest((s) => ({ ...s, open: o }))}
        title={speedTest.title}
        folderPath={speedTest.folderPath}
        sourceId={speedTest.sourceId}
      />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="grid grid-cols-1 gap-2">{children}</div>
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SourceCard({
  title,
  subtitle,
  meta,
  addedLabel,
  onRemove,
  onAction,
  actionIcon,
  actionTitle,
  onAction2,
  action2Icon,
  action2Title,
  onAction3,
  action3Icon,
  action3Title,
}: {
  title: string;
  subtitle: string;
  meta: string;
  added: number;
  addedLabel: string;
  onRemove: () => void;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  actionTitle?: string;
  onAction2?: () => void;
  action2Icon?: React.ReactNode;
  action2Title?: string;
  onAction3?: () => void;
  action3Icon?: React.ReactNode;
  action3Title?: string;
}) {
  const extraActions = [
    { handler: onAction, icon: actionIcon, title: actionTitle },
    { handler: onAction2, icon: action2Icon, title: action2Title },
    { handler: onAction3, icon: action3Icon, title: action3Title },
  ].filter((a) => !!a.handler);

  return (
    <div className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.06]">
          <Folder className="h-5 w-5 text-foreground/70" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/80">
            {meta} · {addedLabel}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {extraActions.map((a, i) => (
          <Button
            key={i}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={a.title}
            onClick={a.handler}
          >
            {a.icon}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function WebdavDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const onSubmit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const s = await api.addWebdavSource({
        name: name.trim() || new URL(url.trim()).host,
        url: url.trim(),
        username: username || undefined,
        password: password || undefined,
      });
      toast({ title: t("action.addWebdav"), description: s.name });
      onOpenChange(false);
      setName("");
      setUrl("");
      setUsername("");
      setPassword("");
    } catch (e: any) {
      toast({ title: t("action.addWebdav"), description: e?.toString() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.webdav.title")}</DialogTitle>
          <DialogDescription>{t("dialog.webdav.desc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t("form.displayName")}>
            <Input
              placeholder="My NAS"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t("form.serverUrl")}>
            <Input
              placeholder="https://nas.example.com/dav/music/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.username")}>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label={t("form.password")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("dialog.webdav.note")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? t("action.adding") : t("action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebdavEditDialog({
  source,
  onOpenChange,
}: {
  source: RemoteSource | null;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const open = source !== null;

  useEffect(() => {
    if (source) {
      setName(source.name);
      setUrl(source.url);
      setUsername(source.username ?? "");
      setPassword("");
    }
  }, [source]);

  const onSubmit = async () => {
    if (!source || !url.trim()) return;
    setSubmitting(true);
    try {
      await api.updateWebdavSource({
        id: source.id,
        name: name.trim() || new URL(url.trim()).host,
        url: url.trim(),
        username: username || undefined,
        password: password || undefined,
      });
      toast({ title: t("action.editWebdav"), description: name.trim() || url.trim() });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("action.editWebdav"), description: e?.toString() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.editWebdav.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t("form.displayName")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t("form.serverUrl")}>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.username")}>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label={t("form.password")}>
              <Input
                type="password"
                placeholder={t("form.passwordKeep")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
