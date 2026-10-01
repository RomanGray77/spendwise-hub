from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.auth import current_user, get_store
from app.models import Summary
from app.store import Store

router = APIRouter(tags=["summary"], dependencies=[Depends(current_user)])


@router.get("/summary", response_model=Summary)
def get_summary(startDate: date, endDate: date, store: Store = Depends(get_store)) -> Summary:
    if startDate > endDate:
        raise HTTPException(status_code=422, detail="startDate must be on or before endDate.")
    return store.summary(startDate, endDate)
