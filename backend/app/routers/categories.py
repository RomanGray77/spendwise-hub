from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import current_user, get_store
from app.models import Category, CategoryInput, User
from app.store import Store, utc_now

router = APIRouter(prefix="/categories", tags=["categories"], dependencies=[Depends(current_user)])


@router.get("", response_model=list[Category])
def list_categories(store: Store = Depends(get_store)) -> list[Category]:
    return sorted(store.categories.values(), key=lambda item: item.name.casefold())


@router.get("/{categoryId}", response_model=Category)
def get_category(categoryId: str, store: Store = Depends(get_store)) -> Category:
    category = store.categories.get(categoryId)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    return category


@router.post("", response_model=Category, status_code=201)
def create_category(payload: CategoryInput, store: Store = Depends(get_store)) -> Category:
    if any(item.name.casefold() == payload.name.casefold() for item in store.categories.values()):
        raise HTTPException(status_code=409, detail="Category name already exists.")
    category = Category(id=str(uuid4()), name=payload.name, createdAt=utc_now())
    store.categories[category.id] = category
    return category


@router.patch("/{categoryId}", response_model=Category)
def rename_category(categoryId: str, payload: CategoryInput, store: Store = Depends(get_store)) -> Category:
    current = store.categories.get(categoryId)
    if current is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    if any(item.id != categoryId and item.name.casefold() == payload.name.casefold() for item in store.categories.values()):
        raise HTTPException(status_code=409, detail="Category name already exists.")
    updated = current.model_copy(update={"name": payload.name})
    store.categories[categoryId] = updated
    return updated


@router.delete("/{categoryId}", status_code=204, response_class=Response)
def delete_category(categoryId: str, store: Store = Depends(get_store)) -> Response:
    if categoryId not in store.categories:
        raise HTTPException(status_code=404, detail="Category not found.")
    if any(tx.categoryId == categoryId for tx in store.transactions.values()):
        raise HTTPException(status_code=409, detail="This category cannot be deleted because transactions are assigned to it.")
    del store.categories[categoryId]
    return Response(status_code=204)
