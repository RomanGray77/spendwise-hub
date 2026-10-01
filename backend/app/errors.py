from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"message": str(exc.detail)})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        message = str(errors[0].get("msg", "Invalid request.")) if errors else "Invalid request."
        if message.startswith("Value error, "):
            message = message.removeprefix("Value error, ")
        status_code = 400 if errors and errors[0].get("loc", [None])[0] == "body" else 422
        return JSONResponse(status_code=status_code, content={"message": message})
