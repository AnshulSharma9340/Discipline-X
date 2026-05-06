from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.services.realtime import socket_app
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    logger.info("DisciplineX starting in {} mode", settings.BACKEND_ENV)
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("DisciplineX stopped")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="DisciplineX — productivity & discipline monitoring API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(settings.API_V1_PREFIX):
        logger.info(
            "{} {} -> {} (rid={})",
            request.method,
            request.url.path,
            response.status_code,
            getattr(request.state, "request_id", "-"),
        )
    return response


@app.get("/health", tags=["meta"])
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "env": settings.BACKEND_ENV})


@app.get("/", tags=["meta"])
async def root() -> JSONResponse:
    return JSONResponse(
        {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "docs": "/docs",
            "api": settings.API_V1_PREFIX,
        }
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Mount Socket.IO. Must come AFTER FastAPI routes for path matching to work.
app.mount("/socket.io", socket_app)
