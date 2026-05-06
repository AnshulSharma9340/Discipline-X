"""Rate limiting via slowapi.

Default: 120 req/min per IP for authenticated, 30 req/min for unauthenticated.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
