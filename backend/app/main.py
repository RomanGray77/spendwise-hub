from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.database import build_engine, build_session_factory, database_url, initialize_database
from app.errors import install_error_handlers
from app.routers import auth, categories, summary, transactions
from app.store import seed_database


def create_app(database_url_override: str | None = None) -> FastAPI:
    engine = build_engine(database_url_override or database_url())
    session_factory = build_session_factory(engine)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_database(engine)
        with session_factory() as session:
            seed_database(session)
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(title="SpendBoard API", version="1.0.0", lifespan=lifespan)
    app.state.engine = engine
    app.state.session_factory = session_factory

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

    return app


app = create_app()
