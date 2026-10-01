from fastapi import Depends, HTTPException, Request, status

from app.store import Store

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "spendboard"


def get_store() -> Store:
    from app.main import store

    return store


def current_user(request: Request, store: Store = Depends(get_store)):
    user_id = request.session.get("user_id")
    if user_id != store.user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return store.user
