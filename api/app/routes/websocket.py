"""
WebSocket routes for real-time updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import logging
from typing import Optional
import uuid as _uuid

from app.core.database import get_db
from app.services.websocket import manager
from app.models.database import User, Mester

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


def validate_uuid(value: Optional[str], field: str) -> Optional[_uuid.UUID]:
    """Validate UUID string"""
    if value is None:
        return None
    try:
        return _uuid.UUID(value)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid {field}")


@router.websocket("/user/{user_id}")
async def websocket_user_endpoint(
    websocket: WebSocket,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for customer users
    
    Provides real-time updates for:
    - New messages
    - Notifications
    - Appointment proposals
    - Job status changes
    - Offer updates
    """
    try:
        # Validate user ID
        user_uuid = validate_uuid(user_id, "user_id")
        
        # Verify user exists
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            await websocket.close(code=4004, reason="User not found")
            return
        
        # Connect the WebSocket
        await manager.connect_user(websocket, str(user_uuid))
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": str(user_uuid),
            "timestamp": str(_uuid.uuid4())
        })
        
        try:
            # Keep connection alive and handle incoming messages
            while True:
                data = await websocket.receive_text()
                # Echo back for ping/pong
                if data == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": str(_uuid.uuid4())
                    })
        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected")
        finally:
            manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass


@router.websocket("/mester/{mester_id}")
async def websocket_mester_endpoint(
    websocket: WebSocket,
    mester_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for service providers (mesters)
    
    Provides real-time updates for:
    - New messages
    - Notifications
    - New job requests (matches)
    - Appointment responses
    - Lead purchase confirmations
    """
    try:
        # Validate mester ID
        mester_uuid = validate_uuid(mester_id, "mester_id")
        
        # Verify mester exists
        mester = db.query(Mester).filter(Mester.id == mester_uuid).first()
        if not mester:
            await websocket.close(code=4004, reason="Mester not found")
            return
        
        # Connect the WebSocket
        await manager.connect_mester(websocket, str(mester_uuid))
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "mester_id": str(mester_uuid),
            "timestamp": str(_uuid.uuid4())
        })
        
        try:
            # Keep connection alive and handle incoming messages
            while True:
                data = await websocket.receive_text()
                # Echo back for ping/pong
                if data == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": str(_uuid.uuid4())
                    })
        except WebSocketDisconnect:
            logger.info(f"Mester {mester_id} disconnected")
        finally:
            manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"WebSocket error for mester {mester_id}: {e}")
        manager.disconnect(websocket)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

