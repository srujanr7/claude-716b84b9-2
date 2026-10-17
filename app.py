# server.py
import os

from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    "add-server",
    host="0.0.0.0",
    port=int(os.environ.get("PORT", "8000")),
)


@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two integers and return the sum."""
    return a + b


if __name__ == "__main__":
    # Serves the MCP endpoint at http://0.0.0.0:$PORT/mcp
    mcp.run(transport="streamable-http")