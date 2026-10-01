from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.auth import DEMO_PASSWORD, DEMO_USERNAME, current_user, get_store
from app.models import LoginRequest, User
from app.store import Store

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=User)
def login(payload: LoginRequest, request: Request, store: Store = Depends(get_store)) -> User:
    if payload.username.strip() != DEMO_USERNAME or payload.password != DEMO_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    request.session["user_id"] = store.user.id
    return store.user


@router.post("/logout", status_code=204, response_class=Response)
def logout(request: Request, _: User = Depends(current_user)) -> Response:
    request.session.clear()
    return Response(status_code=204)


@router.get("/me", response_model=User | None)
def me(request: Request, store: Store = Depends(get_store)) -> User | None:
    if request.session.get("user_id") != store.user.id:
        return None
    return store.user
