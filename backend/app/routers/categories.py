from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import current_user, get_store
from app.models import Category, CategoryInput, User
from app.store import Store

router = APIRouter(prefix="/categories", tags=["categories"], dependencies=[Depends(current_user)])


@router.get("", response_model=list[Category])
def list_categories(store: Store = Depends(get_store)) -> list[Category]:
    return store.list_categories()


@router.get("/{categoryId}", response_model=Category)
def get_category(categoryId: str, store: Store = Depends(get_store)) -> Category:
    category = store.get_category(categoryId)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    return category


@router.post("", response_model=Category, status_code=201)
def create_category(payload: CategoryInput, store: Store = Depends(get_store)) -> Category:
    if store.category_name_exists(payload.name):
        raise HTTPException(status_code=409, detail="Category name already exists.")
    return store.create_category(payload.name)


@router.patch("/{categoryId}", response_model=Category)
def rename_category(categoryId: str, payload: CategoryInput, store: Store = Depends(get_store)) -> Category:
    current = store.get_category(categoryId)
    if current is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    if store.category_name_exists(payload.name, excluding_id=categoryId):
        raise HTTPException(status_code=409, detail="Category name already exists.")
    return store.rename_category(categoryId, payload.name)


@router.delete("/{categoryId}", status_code=204, response_class=Response)
def delete_category(categoryId: str, store: Store = Depends(get_store)) -> Response:
    if store.get_category(categoryId) is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    if store.category_is_in_use(categoryId):
        raise HTTPException(status_code=409, detail="This category cannot be deleted because transactions are assigned to it.")
    store.delete_category(categoryId)
    return Response(status_code=204)
