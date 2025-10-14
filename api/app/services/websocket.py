"""
WebSocket connection manager for real-time features
"""

from typing import Dict, Set, Optional
from fastapi import WebSocket
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # user_id -> set of WebSocket connections
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        
        # mester_id -> set of WebSocket connections
        self.mester_connections: Dict[str, Set[WebSocket]] = {}
        
        # websocket -> user_id mapping for cleanup
        self.websocket_to_user: Dict[WebSocket, str] = {}
        
        # websocket -> mester_id mapping for cleanup
        self.websocket_to_mester: Dict[WebSocket, str] = {}
    
    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Connect a user's WebSocket"""
        await websocket.accept()
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        
        self.user_connections[user_id].add(websocket)
        self.websocket_to_user[websocket] = user_id
        
        logger.info(f"User {user_id} connected via WebSocket")
    
    async def connect_mester(self, websocket: WebSocket, mester_id: str):
        """Connect a mester's WebSocket"""
        await websocket.accept()
        
        if mester_id not in self.mester_connections:
            self.mester_connections[mester_id] = set()
        
        self.mester_connections[mester_id].add(websocket)
        self.websocket_to_mester[websocket] = mester_id
        
        logger.info(f"Mester {mester_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket and clean up"""
        # Check if it's a user connection
        if websocket in self.websocket_to_user:
            user_id = self.websocket_to_user[websocket]
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            del self.websocket_to_user[websocket]
            logger.info(f"User {user_id} disconnected from WebSocket")
        
        # Check if it's a mester connection
        if websocket in self.websocket_to_mester:
            mester_id = self.websocket_to_mester[websocket]
            if mester_id in self.mester_connections:
                self.mester_connections[mester_id].discard(websocket)
                if not self.mester_connections[mester_id]:
                    del self.mester_connections[mester_id]
            del self.websocket_to_mester[websocket]
            logger.info(f"Mester {mester_id} disconnected from WebSocket")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all of a user's connections"""
        if user_id not in self.user_connections:
            return
        
        disconnected = set()
        
        for websocket in self.user_connections[user_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def send_to_mester(self, mester_id: str, message: dict):
        """Send a message to all of a mester's connections"""
        if mester_id not in self.mester_connections:
            return
        
        disconnected = set()
        
        for websocket in self.mester_connections[mester_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to mester {mester_id}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def broadcast_to_thread(self, user_id: str, mester_id: str, message: dict):
        """Broadcast a message to both user and mester in a thread"""
        await self.send_to_user(user_id, message)
        await self.send_to_mester(mester_id, message)
    
    def get_connected_user_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.user_connections.get(user_id, set()))
    
    def get_connected_mester_count(self, mester_id: str) -> int:
        """Get number of active connections for a mester"""
        return len(self.mester_connections.get(mester_id, set()))


# Global connection manager instance
manager = ConnectionManager()

