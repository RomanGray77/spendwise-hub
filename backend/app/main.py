from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.errors import install_error_handlers
from app.routers import auth, categories, summary, transactions
from app.store import Store

store = Store()
app = FastAPI(title="SpendBoard API", version="1.0.0")
app.add_middleware(
    SessionMiddleware,
    secret_key="spendboard-development-session-secret",
    session_cookie="spendboard_session",
    same_site="lax",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
install_error_handlers(app)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
