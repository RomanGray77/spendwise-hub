import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { TransactionForm } from "@/components/TransactionForm";
import { spendBoard, type Category } from "@/services";

export const Route = createFileRoute("/transactions/new")({
  head: () => ({
    meta: [
      { title: "Add a transaction | SpendBoard" },
      {
        name: "description",
        content:
          "Record a new income or expense in SpendBoard with a name, category, amount, date and note.",
      },
      { property: "og:title", content: "Add a transaction | SpendBoard" },
      {
        property: "og:description",
        content: "Log income and expenses in seconds and keep every category total up to date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddTransactionPage,
});

function AddTransactionPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    spendBoard.listCategories().then(setCategories);
  }, []);

  return (
    <AppLayout>
      <h1 className="text-3xl font-semibold">Add transaction</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use a negative amount for an expense and a positive amount for income.
      </p>
      <div className="mt-6 max-w-xl rounded-2xl border border-border bg-card p-6">
        <TransactionForm
          categories={categories}
          onSubmit={async (input) => {
            await spendBoard.createTransaction(input);
            toast.success("Transaction saved");
            navigate({ to: "/" });
          }}
        />
      </div>
    </AppLayout>
  );
}
