#!/usr/bin/env python3
"""Trigger a ChoreBot sync via Home Assistant's websocket API."""

import asyncio
import json
import websockets


async def trigger_sync():
    """Connect to HA websocket and trigger sync."""
    uri = "ws://localhost:8123/api/websocket"

    async with websockets.connect(uri) as websocket:
        # Receive auth required message
        auth_required = await websocket.recv()
        print(f"Auth required: {auth_required}")

        # Send auth (no token needed for local connections in dev mode)
        await websocket.send(
            json.dumps(
                {"type": "auth", "access_token": "dummy_token_not_needed_for_localhost"}
            )
        )

        # Wait for auth response
        auth_result = await websocket.recv()
        print(f"Auth result: {auth_result}")

        # Call service
        await websocket.send(
            json.dumps(
                {
                    "id": 1,
                    "type": "call_service",
                    "domain": "chorebot",
                    "service": "sync",
                    "service_data": {},
                }
            )
        )

        # Wait for result
        result = await websocket.recv()
        print(f"Sync result: {result}")


if __name__ == "__main__":
    asyncio.run(trigger_sync())
