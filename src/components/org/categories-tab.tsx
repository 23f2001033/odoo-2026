"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type FieldDef = { key: string; label: string; type: "text" | "number" | "date" };

type Category = {
  id: string;
  name: string;
  description: string | null;
  fieldDefs: FieldDef[];
  assets: number;
};

export function CategoriesTab({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setFields([]);
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setFields(c.fieldDefs);
    setOpen(true);
  }

  function updateField(i: number, patch: Partial<FieldDef>) {
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      description: (form.get("description") as string) || null,
      fieldDefs: fields.filter((f) => f.key && f.label),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/v1/categories/${editing.id}`, payload);
        toast.success(`Category "${payload.name}" updated`);
      } else {
        await api.post("/api/v1/categories", payload);
        toast.success(`Category "${payload.name}" created`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>New Category</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Custom fields</TableHead>
              <TableHead className="text-right">Assets</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">
                  {c.description ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.fieldDefs.length > 0
                    ? c.fieldDefs.map((f) => f.label).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.assets}</TableCell>
                <TableCell className="text-right">
                  <Button size="xs" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No categories yet — e.g. Electronics, Furniture, Vehicles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New Category"}</DialogTitle>
            <DialogDescription>
              Custom fields appear as extra inputs when registering assets of this category
              (e.g. warranty period for Electronics).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" name="name" defaultValue={editing?.name} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Input id="cat-desc" name="description" defaultValue={editing?.description ?? ""} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom fields</Label>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setFields((fs) => [...fs, { key: "", label: "", type: "text" }])}
                >
                  + Add field
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">No custom fields.</p>
              )}
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="key (e.g. warrantyMonths)"
                    value={f.key}
                    onChange={(e) => updateField(i, { key: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Label"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    className="flex-1"
                  />
                  <NativeSelect
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldDef["type"] })}
                    className="w-24"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </NativeSelect>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setFields((fs) => fs.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
