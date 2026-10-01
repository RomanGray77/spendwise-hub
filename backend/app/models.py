from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel, ConfigDict, Field, field_validator


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(APIModel):
    username: str
    password: str


class User(APIModel):
    id: str
    username: str


class CategoryInput(APIModel):
    name: str = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Category name is required.")
        return value


class Category(APIModel):
    id: str
    name: str
    createdAt: datetime


class TransactionInput(APIModel):
    name: str = Field(min_length=1)
    categoryId: str = Field(min_length=1)
    amount: str
    date: date
    note: str = ""

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Transaction name is required.")
        return value

    @field_validator("amount")
    @classmethod
    def valid_amount(cls, value: str) -> str:
        value = value.strip()
        import re

        if not re.fullmatch(r"-?\d+([.,]\d{1,2})?", value):
            if re.fullmatch(r"-?\d+[.,]\d{3,}", value):
                raise ValueError("Amount may contain at most two decimal places.")
            raise ValueError("Amount must be a valid number.")
        try:
            cents = Decimal(value.replace(",", ".")) * 100
        except InvalidOperation as exc:
            raise ValueError("Amount must be a valid number.") from exc
        if cents == 0:
            raise ValueError("Amount must not be zero.")
        return value

    @field_validator("note")
    @classmethod
    def trim_note(cls, value: str) -> str:
        return value.strip()

    @property
    def amount_cents(self) -> int:
        return int(Decimal(self.amount.replace(",", ".")) * 100)


class Transaction(APIModel):
    id: str
    name: str
    amountCents: int
    date: date
    note: str
    categoryId: str
    createdAt: datetime
    updatedAt: datetime


class CategorySummary(APIModel):
    categoryId: str
    categoryName: str
    totalCents: int
    count: int = Field(ge=0)
    percentage: float = Field(ge=0)


class Summary(APIModel):
    totalIncomeCents: int
    totalExpenseCents: int
    netBalanceCents: int
    income: list[CategorySummary]
    expenses: list[CategorySummary]


class ErrorResponse(APIModel):
    message: str
