import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  centsToInput,
  defaultRange,
  formatCents,
  spendBoard,
  type Category,
  type Transaction,
} from "@/services";

export const Route = createFileRoute("/categories/$categoryId")({
  validateSearch: (search: Record<string, unknown>) => {
    const fallback = defaultRange();
    return {
      startDate: typeof search.startDate === "string" ? search.startDate : fallback.startDate,
      endDate: typeof search.endDate === "string" ? search.endDate : fallback.endDate,
    };
  },
  head: () => ({
    meta: [
      { title: "Category details | SpendBoard" },
      {
        name: "description",
        content:
          "Inspect every transaction behind a SpendBoard category total, then edit or delete entries.",
      },
      { property: "og:title", content: "Category details | SpendBoard" },
      {
        property: "og:description",
        content: "See, edit and delete the transactions behind any category total.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryDetailsPage,
});

function CategoryDetailsPage() {
  const { categoryId } = Route.useParams();
  const { startDate, endDate } = Route.useSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(() => {
    spendBoard.listCategories().then(setCategories);
    spendBoard.listTransactions({ categoryId, startDate, endDate }).then(setTransactions);
  }, [categoryId, startDate, endDate]);

  useEffect(() => {
    load();
    return spendBoard.subscribe(load);
  }, [load]);

  const category = categories.find((c) => c.id === categoryId);
  const total = transactions.reduce((s, t) => s + t.amountCents, 0);

  return (
    <AppLayout>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to overview
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{category?.name ?? "Category"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {startDate} → {endDate} · {transactions.length} transaction
            {transactions.length === 1 ? "" : "s"}
          </p>
        </div>
        <p
          className={`numeric font-display text-2xl font-semibold ${total < 0 ? "text-expense" : "text-income"}`}
        >
          {formatCents(total)}
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {transactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No transactions in this category for the selected date range.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="numeric w-24 text-sm text-muted-foreground">{t.date}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category?.name}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={`numeric font-semibold ${t.amountCents < 0 ? "text-expense" : "text-income"}`}
                >
                  {formatCents(t.amountCents)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${t.name}`}
                  onClick={() => setEditing(t)}
                >
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete “{t.name}”? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await spendBoard.deleteTransaction(t.id);
                          toast.success("Transaction deleted");
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransactionForm
              categories={categories}
              submitLabel="Save changes"
              initial={{
                name: editing.name,
                categoryId: editing.categoryId,
                amount: centsToInput(editing.amountCents),
                date: editing.date,
                note: editing.note,
              }}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                await spendBoard.updateTransaction(editing.id, input);
                toast.success("Transaction updated");
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
