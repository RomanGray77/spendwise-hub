import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spendBoard, type Category } from "@/services";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Categories | SpendBoard" },
      {
        name: "description",
        content:
          "Create, rename and delete the categories SpendBoard uses to group your income and expenses.",
      },
      { property: "og:title", content: "Categories | SpendBoard" },
      {
        property: "og:description",
        content: "Organise your ledger: add, rename and remove unused spending categories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    spendBoard.listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
    return spendBoard.subscribe(load);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setError("");
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <AppLayout>
      <h1 className="text-3xl font-semibold">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Income and expenses share the same category list.
      </p>

      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await spendBoard.createCategory(newName);
            setNewName("");
          }, "Category added");
        }}
      >
        <Input
          aria-label="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
        />
        <Button type="submit">Add</Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 px-5 py-3">
            {editingId === category.id ? (
              <>
                <Input
                  aria-label={`Rename ${category.name}`}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    run(async () => {
                      await spendBoard.renameCategory(category.id, editingName);
                      setEditingId(null);
                    }, "Category renamed")
                  }
                >
                  <Check className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">{category.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => {
                    setEditingId(category.id);
                    setEditingName(category.name);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${category.name}`}
                  onClick={() =>
                    run(() => spendBoard.deleteCategory(category.id), "Category deleted")
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
