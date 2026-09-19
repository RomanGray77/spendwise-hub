import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, TransactionInput } from "@/services";
import { todayISO } from "@/services";

export interface TransactionFormProps {
  categories: Category[];
  initial?: Partial<TransactionInput>;
  submitLabel?: string;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onCancel?: () => void;
}

export function TransactionForm({
  categories,
  initial,
  submitLabel = "Save transaction",
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ name, categoryId, amount, date, note });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the transaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="tx-name">Name</Label>
        <Input
          id="tx-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Groceries"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-category">Category</Label>
          <select
            id="tx-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-amount">Amount (USD)</Label>
          <Input
            id="tx-amount"
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="-75.50"
            className="numeric"
          />
          <p className="text-xs text-muted-foreground">
            Positive amounts are income, negative amounts are expenses.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-date">Date</Label>
        <Input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="numeric"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-note">Note (optional)</Label>
        <Textarea id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
