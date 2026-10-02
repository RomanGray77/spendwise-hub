from collections import defaultdict
from datetime import date, datetime, timezone
from uuid import NAMESPACE_URL, uuid4, uuid5

from app.models import Category, CategorySummary, Summary, Transaction, TransactionInput, User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    """Process-local in-memory data store, seeded for the demo frontend."""

    def __init__(self) -> None:
        self.user = User(id="user-1", username="demo")
        self.categories: dict[str, Category] = {}
        self.transactions: dict[str, Transaction] = {}
        self.tokens: dict[str, str] = {}
        self._seed()

    def _seed(self) -> None:
        now = utc_now()
        names = ["Food", "Transport", "Housing", "Salary", "Entertainment", "Other"]
        category_ids: dict[str, str] = {}
        for name in names:
            # Stable demo IDs keep overview links valid when the development
            # server reloads and recreates this process-local store.
            category_id = str(uuid5(NAMESPACE_URL, f"spendboard:category:{name.casefold()}"))
            category_ids[name] = category_id
            self.categories[category_id] = Category(id=category_id, name=name, createdAt=now)

        year = date.today().year
        sample_rows = [
            ("Monthly salary", 450000, date(year, 1, 31), "Salary", "Employer payout"),
            ("Monthly salary", 450000, date(year, 2, 28), "Salary", ""),
            ("Freelance project", 92000, date(year, 3, 12), "Other", "Logo redesign"),
            ("Rent", -180000, date(year, 1, 5), "Housing", ""),
            ("Rent", -180000, date(year, 2, 5), "Housing", ""),
            ("Groceries", -14250, date(year, 2, 9), "Food", ""),
            ("Groceries", -11080, date(year, 3, 2), "Food", ""),
            ("Dinner out", -7550, date(year, 3, 8), "Food", "Birthday"),
            ("Metro pass", -4500, date(year, 2, 1), "Transport", ""),
            ("Taxi", -2340, date(year, 3, 15), "Transport", ""),
            ("Cinema", -1800, date(year, 3, 20), "Entertainment", ""),
        ]
        for name, amount, tx_date, category, note in sample_rows:
            self.create_transaction(
                TransactionInput(
                    name=name, categoryId=category_ids[category], amount=f"{amount / 100:.2f}", date=tx_date, note=note
                )
            )

    def create_transaction(self, payload: TransactionInput) -> Transaction:
        now = utc_now()
        tx = Transaction(
            id=str(uuid4()),
            name=payload.name,
            amountCents=payload.amount_cents,
            date=payload.date,
            note=payload.note,
            categoryId=payload.categoryId,
            createdAt=now,
            updatedAt=now,
        )
        self.transactions[tx.id] = tx
        return tx

    def summary(self, start: date, end: date) -> Summary:
        relevant = [tx for tx in self.transactions.values() if start <= tx.date <= end]
        income = [tx for tx in relevant if tx.amountCents > 0]
        expenses = [tx for tx in relevant if tx.amountCents < 0]
        total_income = sum(tx.amountCents for tx in income)
        total_expenses = sum(tx.amountCents for tx in expenses)

        def section(rows: list[Transaction], total: int) -> list[CategorySummary]:
            totals: dict[str, int] = defaultdict(int)
            counts: dict[str, int] = defaultdict(int)
            for tx in rows:
                totals[tx.categoryId] += tx.amountCents
                counts[tx.categoryId] += 1
            result = [
                CategorySummary(
                    categoryId=category_id,
                    categoryName=self.categories[category_id].name,
                    totalCents=amount,
                    count=counts[category_id],
                    percentage=(abs(amount) / abs(total) * 100) if total else 0,
                )
                for category_id, amount in totals.items()
            ]
            return sorted(result, key=lambda item: abs(item.totalCents), reverse=True)

        return Summary(
            totalIncomeCents=total_income,
            totalExpenseCents=total_expenses,
            netBalanceCents=total_income + total_expenses,
            income=section(income, total_income),
            expenses=section(expenses, total_expenses),
        )
