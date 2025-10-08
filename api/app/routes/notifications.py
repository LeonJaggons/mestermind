"""
Notification routes for managing user notifications
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid as _uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database import (
    Notification,
    NotificationPreference,
    User,
    Mester,
)
from app.models.schemas import (
    NotificationResponse,
    NotificationListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(
        50, ge=1, le=100, description="Number of notifications to return"
    ),
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
):
    """
    List notifications for the current user.

    Returns both read and unread notifications unless filtered.
    Includes total unread count.
    """
    # Check if user is a mester
    mester = db.query(Mester).filter(Mester.email == current_user.email).first()

    query = db.query(Notification)

    if mester:
        query = query.filter(Notification.mester_id == mester.id)
    else:
        query = query.filter(Notification.user_id == current_user.id)

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    # Order newest first
    query = query.order_by(Notification.created_at.desc())

    # Get notifications with pagination
    notifications = query.offset(skip).limit(limit).all()

    # Get unread count
    unread_query = db.query(Notification)
    if mester:
        unread_query = unread_query.filter(Notification.mester_id == mester.id)
    else:
        unread_query = unread_query.filter(Notification.user_id == current_user.id)

    unread_count = unread_query.filter(Notification.is_read == False).count()

    # Convert to response models
    items = [
        NotificationResponse(
            id=str(notif.id),
            user_id=str(notif.user_id) if notif.user_id else None,
            mester_id=str(notif.mester_id) if notif.mester_id else None,
            type=notif.type.value,
            title=notif.title,
            body=notif.body,
            request_id=str(notif.request_id) if notif.request_id else None,
            offer_id=str(notif.offer_id) if notif.offer_id else None,
            message_id=str(notif.message_id) if notif.message_id else None,
            action_url=notif.action_url,
            data=notif.data,
            is_read=notif.is_read,
            read_at=notif.read_at,
            created_at=notif.created_at,
        )
        for notif in notifications
    ]

    return NotificationListResponse(items=items, unread_count=unread_count)


@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read"""

    try:
        notif_uuid = _uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    notification = db.query(Notification).filter(Notification.id == notif_uuid).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify ownership
    mester = db.query(Mester).filter(Mester.email == current_user.email).first()
    if mester:
        if notification.mester_id != mester.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if notification.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Mark as read
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()

    return {"ok": True, "id": str(notification.id)}


@router.post("/read-all")
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""

    mester = db.query(Mester).filter(Mester.email == current_user.email).first()

    query = db.query(Notification)

    if mester:
        query = query.filter(Notification.mester_id == mester.id)
    else:
        query = query.filter(Notification.user_id == current_user.id)

    # Update all unread notifications
    updated_count = query.filter(Notification.is_read == False).update(
        {"is_read": True, "read_at": datetime.utcnow()}, synchronize_session=False
    )

    db.commit()

    return {"ok": True, "updated_count": updated_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification"""

    try:
        notif_uuid = _uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    notification = db.query(Notification).filter(Notification.id == notif_uuid).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify ownership
    mester = db.query(Mester).filter(Mester.email == current_user.email).first()
    if mester:
        if notification.mester_id != mester.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if notification.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(notification)
    db.commit()

    return {"ok": True, "id": str(notification_id)}


@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get notification preferences for the current user"""

    mester = db.query(Mester).filter(Mester.email == current_user.email).first()

    query = db.query(NotificationPreference)

    if mester:
        pref = query.filter(NotificationPreference.mester_id == mester.id).first()
    else:
        pref = query.filter(NotificationPreference.user_id == current_user.id).first()

    # Create default preferences if none exist
    if not pref:
        pref = NotificationPreference(
            mester_id=mester.id if mester else None,
            user_id=current_user.id if not mester else None,
            preferences={
                "new_request": {"email": True, "in_app": True, "sms": False},
                "new_offer": {"email": True, "in_app": True, "sms": False},
                "new_message": {"email": True, "in_app": True, "sms": False},
                "booking_confirmed": {"email": True, "in_app": True, "sms": True},
            },
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return NotificationPreferenceResponse(
        id=str(pref.id),
        user_id=str(pref.user_id) if pref.user_id else None,
        mester_id=str(pref.mester_id) if pref.mester_id else None,
        preferences=pref.preferences,
        quiet_hours_start=pref.quiet_hours_start,
        quiet_hours_end=pref.quiet_hours_end,
        created_at=pref.created_at,
        updated_at=pref.updated_at,
    )


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    update: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification preferences for the current user"""

    mester = db.query(Mester).filter(Mester.email == current_user.email).first()

    query = db.query(NotificationPreference)

    if mester:
        pref = query.filter(NotificationPreference.mester_id == mester.id).first()
    else:
        pref = query.filter(NotificationPreference.user_id == current_user.id).first()

    # Create if doesn't exist
    if not pref:
        pref = NotificationPreference(
            mester_id=mester.id if mester else None,
            user_id=current_user.id if not mester else None,
            preferences=update.preferences,
            quiet_hours_start=update.quiet_hours_start,
            quiet_hours_end=update.quiet_hours_end,
        )
        db.add(pref)
    else:
        # Update existing
        pref.preferences = update.preferences
        if update.quiet_hours_start is not None:
            pref.quiet_hours_start = update.quiet_hours_start
        if update.quiet_hours_end is not None:
            pref.quiet_hours_end = update.quiet_hours_end

    db.commit()
    db.refresh(pref)

    return NotificationPreferenceResponse(
        id=str(pref.id),
        user_id=str(pref.user_id) if pref.user_id else None,
        mester_id=str(pref.mester_id) if pref.mester_id else None,
        preferences=pref.preferences,
        quiet_hours_start=pref.quiet_hours_start,
        quiet_hours_end=pref.quiet_hours_end,
        created_at=pref.created_at,
        updated_at=pref.updated_at,
    )
