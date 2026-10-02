from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_session
from app.store import Store

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "spendboard"


def get_store(session: Session = Depends(get_session)) -> Iterator[Store]:
    yield Store(session)


def current_user(request: Request, store: Store = Depends(get_store)):
    user_id = request.session.get("user_id")
    user = store.get_user(user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user
