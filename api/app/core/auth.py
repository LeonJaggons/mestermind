"""
Authentication dependencies for FastAPI routes.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os
import logging

from app.core.database import get_db
from app.models.database import User, Mester

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
_firebase_initialized = False
_firebase_available = False


def _init_firebase():
    global _firebase_initialized, _firebase_available
    if not _firebase_initialized:
        _firebase_initialized = True

        # Check if Firebase credentials are available
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                _firebase_available = True
                logger.info("Firebase Admin SDK initialized with credentials")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
                _firebase_available = False
        else:
            # Development mode: Don't try default credentials, they might be for wrong project
            logger.warning(
                "No Firebase credentials configured (FIREBASE_CREDENTIALS_PATH not set)"
            )
            logger.warning("Running in development mode without token verification")
            _firebase_available = False


security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user.
    Verifies Firebase JWT token and returns or creates the user.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Initialize Firebase if needed
        _init_firebase()

        if _firebase_available:
            # Verify the Firebase ID token
            decoded_token = firebase_auth.verify_id_token(token)
            firebase_uid = decoded_token["uid"]
            email = decoded_token.get("email", "")
        else:
            # Development mode: decode token without verification
            # WARNING: This is insecure and should only be used in development
            import json
            import base64

            logger.warning("Using unverified token decoding (development mode only)")

            try:
                # Decode JWT payload (without verification)
                parts = token.split(".")
                if len(parts) != 3:
                    raise ValueError("Invalid token format")

                # Add padding if needed
                payload = parts[1]
                payload += "=" * (4 - len(payload) % 4)

                decoded_bytes = base64.urlsafe_b64decode(payload)
                decoded_token = json.loads(decoded_bytes)

                firebase_uid = decoded_token.get("user_id") or decoded_token.get("uid")
                email = decoded_token.get("email", "")

                if not firebase_uid:
                    raise ValueError("No user ID in token")

                logger.info(f"Development mode: Decoded token for user {firebase_uid}")
            except Exception as e:
                logger.error(f"Failed to decode token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Get or create user
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

        if not user:
            # Auto-create user from Firebase token
            name_parts = decoded_token.get("name", "").split(" ", 1)
            first_name = (
                name_parts[0]
                if name_parts
                else email.split("@")[0]
                if email
                else "User"
            )
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user = User(
                firebase_uid=firebase_uid,
                email=email or f"{firebase_uid}@temp.local",
                first_name=first_name,
                last_name=last_name,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {user.id}")

        return user

    except firebase_auth.InvalidIdTokenError as e:
        logger.error(f"Invalid Firebase token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to get the current authenticated user, but allows unauthenticated requests.
    Returns None if no valid authentication is provided.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_mester(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[Mester]:
    """
    Dependency to get the current user's mester profile.
    Returns None if the user is not a mester.
    """
    # Try to find by user_id first
    mester = db.query(Mester).filter(Mester.user_id == current_user.id).first()
    
    # Fallback: try to find by email (for legacy data)
    if not mester and current_user.email:
        from sqlalchemy import func
        normalized_email = current_user.email.strip().lower()
        mester = db.query(Mester).filter(func.lower(Mester.email) == normalized_email).first()
    
    return mester
