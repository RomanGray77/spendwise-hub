from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import current_user
from app.models import Transaction, TransactionInput
from app.auth import get_store
from app.store import Store, utc_now

router = APIRouter(prefix="/transactions", tags=["transactions"], dependencies=[Depends(current_user)])


def check_category(store: Store, category_id: str) -> None:
    if category_id not in store.categories:
        raise HTTPException(status_code=404, detail="Category does not exist.")


@router.get("", response_model=list[Transaction])
def list_transactions(
    categoryId: str | None = None,
    startDate: date | None = None,
    endDate: date | None = None,
    store: Store = Depends(get_store),
) -> list[Transaction]:
    if startDate and endDate and startDate > endDate:
        raise HTTPException(status_code=422, detail="startDate must be on or before endDate.")
    rows = list(store.transactions.values())
    if categoryId is not None:
        rows = [tx for tx in rows if tx.categoryId == categoryId]
    if startDate is not None:
        rows = [tx for tx in rows if tx.date >= startDate]
    if endDate is not None:
        rows = [tx for tx in rows if tx.date <= endDate]
    return sorted(rows, key=lambda tx: (tx.date, tx.createdAt), reverse=True)


@router.post("", response_model=Transaction, status_code=201)
def create_transaction(payload: TransactionInput, store: Store = Depends(get_store)) -> Transaction:
    check_category(store, payload.categoryId)
    return store.create_transaction(payload)


@router.put("/{transactionId}", response_model=Transaction)
def update_transaction(transactionId: str, payload: TransactionInput, store: Store = Depends(get_store)) -> Transaction:
    if transactionId not in store.transactions:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    check_category(store, payload.categoryId)
    current = store.transactions[transactionId]
    updated = Transaction(
        id=current.id,
        name=payload.name,
        amountCents=payload.amount_cents,
        date=payload.date,
        note=payload.note,
        categoryId=payload.categoryId,
        createdAt=current.createdAt,
        updatedAt=utc_now(),
    )
    store.transactions[transactionId] = updated
    return updated


@router.delete("/{transactionId}", status_code=204, response_class=Response)
def delete_transaction(transactionId: str, store: Store = Depends(get_store)) -> Response:
    if transactionId not in store.transactions:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    del store.transactions[transactionId]
    return Response(status_code=204)
