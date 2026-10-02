import os
from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.tables import Base

DEFAULT_DATABASE_URL = "sqlite:///./spendboard.db"
DATABASE_URL_ENV = "DATABASE_URL"


def database_url() -> str:
    return os.getenv(DATABASE_URL_ENV, DEFAULT_DATABASE_URL)


def build_engine(url: str) -> Engine:
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    engine_args = {"poolclass": StaticPool} if url in {"sqlite://", "sqlite:///:memory:"} else {}
    return create_engine(url, connect_args=connect_args, **engine_args)


def initialize_database(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session(request: Request) -> Iterator[Session]:
    session_factory: sessionmaker[Session] = request.app.state.session_factory
    with session_factory() as session:
        yield session
