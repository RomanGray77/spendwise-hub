from collections import defaultdict
from datetime import date, datetime, timezone
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Category, CategorySummary, Summary, Transaction, TransactionInput, User
from app.tables import CategoryRow, TransactionRow, UserRow


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _category(row: CategoryRow) -> Category:
    return Category(id=row.id, name=row.name, createdAt=row.created_at)


def _transaction(row: TransactionRow) -> Transaction:
    return Transaction(
        id=row.id,
        name=row.name,
        amountCents=row.amount_cents,
        date=row.date,
        note=row.note,
        categoryId=row.category_id,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


class Store:
    """Database-backed repository for the API's domain models."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user(self, user_id: str = "user-1") -> User | None:
        row = self.session.get(UserRow, user_id)
        return User(id=row.id, username=row.username) if row else None

    def list_categories(self) -> list[Category]:
        rows = self.session.scalars(select(CategoryRow).order_by(func.lower(CategoryRow.name))).all()
        return [_category(row) for row in rows]

    def get_category(self, category_id: str) -> Category | None:
        row = self.session.get(CategoryRow, category_id)
        return _category(row) if row else None

    def category_name_exists(self, name: str, excluding_id: str | None = None) -> bool:
        statement = select(CategoryRow.id).where(func.lower(CategoryRow.name) == name.casefold())
        if excluding_id is not None:
            statement = statement.where(CategoryRow.id != excluding_id)
        return self.session.scalar(statement) is not None

    def create_category(self, name: str) -> Category:
        row = CategoryRow(id=str(uuid4()), name=name, created_at=utc_now())
        self.session.add(row)
        self.session.commit()
        return _category(row)

    def rename_category(self, category_id: str, name: str) -> Category | None:
        row = self.session.get(CategoryRow, category_id)
        if row is None:
            return None
        row.name = name
        self.session.commit()
        return _category(row)

    def category_is_in_use(self, category_id: str) -> bool:
        statement = select(TransactionRow.id).where(TransactionRow.category_id == category_id).limit(1)
        return self.session.scalar(statement) is not None

    def delete_category(self, category_id: str) -> bool:
        row = self.session.get(CategoryRow, category_id)
        if row is None:
            return False
        self.session.delete(row)
        self.session.commit()
        return True

    def list_transactions(
        self,
        category_id: str | None = None,
        start: date | None = None,
        end: date | None = None,
    ) -> list[Transaction]:
        statement = select(TransactionRow)
        if category_id is not None:
            statement = statement.where(TransactionRow.category_id == category_id)
        if start is not None:
            statement = statement.where(TransactionRow.date >= start)
        if end is not None:
            statement = statement.where(TransactionRow.date <= end)
        statement = statement.order_by(TransactionRow.date.desc(), TransactionRow.created_at.desc())
        return [_transaction(row) for row in self.session.scalars(statement).all()]

    def get_transaction(self, transaction_id: str) -> Transaction | None:
        row = self.session.get(TransactionRow, transaction_id)
        return _transaction(row) if row else None

    def create_transaction(self, payload: TransactionInput) -> Transaction:
        now = utc_now()
        row = TransactionRow(
            id=str(uuid4()),
            name=payload.name,
            amount_cents=payload.amount_cents,
            date=payload.date,
            note=payload.note,
            category_id=payload.categoryId,
            created_at=now,
            updated_at=now,
        )
        self.session.add(row)
        self.session.commit()
        return _transaction(row)

    def update_transaction(self, transaction_id: str, payload: TransactionInput) -> Transaction | None:
        row = self.session.get(TransactionRow, transaction_id)
        if row is None:
            return None
        row.name = payload.name
        row.amount_cents = payload.amount_cents
        row.date = payload.date
        row.note = payload.note
        row.category_id = payload.categoryId
        row.updated_at = utc_now()
        self.session.commit()
        return _transaction(row)

    def delete_transaction(self, transaction_id: str) -> bool:
        row = self.session.get(TransactionRow, transaction_id)
        if row is None:
            return False
        self.session.delete(row)
        self.session.commit()
        return True

    def summary(self, start: date, end: date) -> Summary:
        relevant = self.list_transactions(start=start, end=end)
        income = [tx for tx in relevant if tx.amountCents > 0]
        expenses = [tx for tx in relevant if tx.amountCents < 0]
        total_income = sum(tx.amountCents for tx in income)
        total_expenses = sum(tx.amountCents for tx in expenses)
        categories = {item.id: item.name for item in self.list_categories()}

        def section(rows: list[Transaction], total: int) -> list[CategorySummary]:
            totals: dict[str, int] = defaultdict(int)
            counts: dict[str, int] = defaultdict(int)
            for tx in rows:
                totals[tx.categoryId] += tx.amountCents
                counts[tx.categoryId] += 1
            result = [
                CategorySummary(
                    categoryId=category_id,
                    categoryName=categories[category_id],
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


def seed_database(session: Session) -> None:
    if session.get(UserRow, "user-1") is None:
        session.add(UserRow(id="user-1", username="demo"))

    if session.scalar(select(CategoryRow.id).limit(1)) is not None:
        session.commit()
        return

    now = utc_now()
    names = ["Food", "Transport", "Housing", "Salary", "Entertainment", "Other"]
    category_ids = {
        name: str(uuid5(NAMESPACE_URL, f"spendboard:category:{name.casefold()}")) for name in names
    }
    session.add_all(CategoryRow(id=category_ids[name], name=name, created_at=now) for name in names)

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
    session.add_all(
        TransactionRow(
            id=str(uuid4()),
            name=name,
            amount_cents=amount,
            date=transaction_date,
            note=note,
            category_id=category_ids[category],
            created_at=now,
            updated_at=now,
        )
        for name, amount, transaction_date, category, note in sample_rows
    )
    session.commit()
