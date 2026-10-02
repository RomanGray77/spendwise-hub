from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import current_user
from app.models import Transaction, TransactionInput
from app.auth import get_store
from app.store import Store

router = APIRouter(prefix="/transactions", tags=["transactions"], dependencies=[Depends(current_user)])


def check_category(store: Store, category_id: str) -> None:
    if store.get_category(category_id) is None:
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
    return store.list_transactions(category_id=categoryId, start=startDate, end=endDate)


@router.post("", response_model=Transaction, status_code=201)
def create_transaction(payload: TransactionInput, store: Store = Depends(get_store)) -> Transaction:
    check_category(store, payload.categoryId)
    return store.create_transaction(payload)


@router.put("/{transactionId}", response_model=Transaction)
def update_transaction(transactionId: str, payload: TransactionInput, store: Store = Depends(get_store)) -> Transaction:
    if store.get_transaction(transactionId) is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    check_category(store, payload.categoryId)
    updated = store.update_transaction(transactionId, payload)
    assert updated is not None
    return updated


@router.delete("/{transactionId}", status_code=204, response_class=Response)
def delete_transaction(transactionId: str, store: Store = Depends(get_store)) -> Response:
    if not store.delete_transaction(transactionId):
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return Response(status_code=204)
