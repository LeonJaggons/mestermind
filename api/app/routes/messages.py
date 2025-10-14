"""
Messaging routes for customer-mester conversations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
import uuid as _uuid
from typing import Optional, List

# No extra SQL expression imports needed
from datetime import datetime

from app.core.database import get_db
from app.models.database import (
    MessageThread as MessageThreadModel,
    Message as MessageModel,
    Request as RequestModel,
    Mester as MesterModel,
    LeadPurchase,
)
from app.models.schemas import (
    MessageThreadCreate,
    MessageThreadResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/messages", tags=["messages"])


def _validate_uuid(value: Optional[str], field: str) -> Optional[_uuid.UUID]:
    if value is None:
        return None
    try:
        return _uuid.UUID(value)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field}") from exc


@router.post("/threads", response_model=MessageThreadResponse)
def create_or_get_thread(payload: MessageThreadCreate, db: Session = Depends(get_db)):
    request_id = _validate_uuid(payload.request_id, "request_id")
    mester_id = _validate_uuid(payload.mester_id, "mester_id")
    customer_user_id = _validate_uuid(payload.customer_user_id, "customer_user_id")

    req = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    mester = db.query(MesterModel).filter(MesterModel.id == mester_id).first()
    if not mester:
        raise HTTPException(status_code=404, detail="Mester not found")

    thread = (
        db.query(MessageThreadModel)
        .filter(
            MessageThreadModel.request_id == request_id,
            MessageThreadModel.mester_id == mester_id,
        )
        .first()
    )
    if not thread:
        # Use customer_user_id from payload if provided, otherwise get from request
        thread_customer_id = customer_user_id if customer_user_id else req.user_id
        thread = MessageThreadModel(
            request_id=request_id,
            mester_id=mester_id,
            customer_user_id=thread_customer_id,
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
    else:
        # Update existing thread's customer_user_id if it's None
        if thread.customer_user_id is None and req.user_id:
            thread.customer_user_id = req.user_id
            db.commit()
            db.refresh(thread)

    return MessageThreadResponse(
        id=str(thread.id),
        request_id=str(thread.request_id),
        mester_id=str(thread.mester_id),
        customer_user_id=str(thread.customer_user_id)
        if thread.customer_user_id
        else None,
        last_message_at=thread.last_message_at,
        last_message_preview=thread.last_message_preview,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.get("/threads", response_model=List[MessageThreadResponse])
def list_threads(
    db: Session = Depends(get_db),
    request_id: Optional[str] = Query(None),
    mester_id: Optional[str] = Query(None),
    customer_user_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    viewer_type: Optional[str] = Query(None, pattern="^(customer|mester)$"),
):
    q = db.query(MessageThreadModel)

    if request_id:
        q = q.filter(
            MessageThreadModel.request_id == _validate_uuid(request_id, "request_id")
        )
    if mester_id:
        q = q.filter(
            MessageThreadModel.mester_id == _validate_uuid(mester_id, "mester_id")
        )
    if customer_user_id:
        q = q.filter(
            MessageThreadModel.customer_user_id
            == _validate_uuid(customer_user_id, "customer_user_id")
        )

    q = q.order_by(MessageThreadModel.last_message_at.desc().nullslast())
    rows = q.offset(skip).limit(limit).all()

    # If viewer is mester, mask preview when latest message is from customer after first mester reply
    masked_placeholder = "New customer message — continue to view in Mestermind"

    def _masked_preview(thread: MessageThreadModel) -> Optional[str]:
        if viewer_type != "mester":
            return thread.last_message_preview
        # Fetch last message and first mester reply time
        last_msg = (
            db.query(MessageModel)
            .filter(MessageModel.thread_id == thread.id)
            .order_by(MessageModel.created_at.desc())
            .first()
        )
        if not last_msg:
            return thread.last_message_preview
        first_mester = (
            db.query(MessageModel)
            .filter(
                MessageModel.thread_id == thread.id,
                MessageModel.sender_type == "mester",
            )
            .order_by(MessageModel.created_at.asc())
            .first()
        )
        if not first_mester:
            return thread.last_message_preview
        if (
            last_msg.sender_type == "customer"
            and last_msg.created_at > first_mester.created_at
        ):
            return masked_placeholder
        return thread.last_message_preview

    return [
        MessageThreadResponse(
            id=str(t.id),
            request_id=str(t.request_id),
            mester_id=str(t.mester_id),
            customer_user_id=str(t.customer_user_id) if t.customer_user_id else None,
            last_message_at=t.last_message_at,
            last_message_preview=_masked_preview(t),
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in rows
    ]


@router.get("/threads/{thread_id}", response_model=MessageThreadResponse)
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    thread = (
        db.query(MessageThreadModel)
        .filter(MessageThreadModel.id == _validate_uuid(thread_id, "thread_id"))
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return MessageThreadResponse(
        id=str(thread.id),
        request_id=str(thread.request_id),
        mester_id=str(thread.mester_id),
        customer_user_id=str(thread.customer_user_id)
        if thread.customer_user_id
        else None,
        last_message_at=thread.last_message_at,
        last_message_preview=thread.last_message_preview,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
def list_thread_messages(
    thread_id: str,
    db: Session = Depends(get_db),
    limit: int = Query(200, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    viewer_type: Optional[str] = Query(None, pattern="^(customer|mester)$"),
    mester_id: Optional[str] = Query(None),
):
    thread_uuid = _validate_uuid(thread_id, "thread_id")

    rows = (
        db.query(MessageModel)
        .filter(MessageModel.thread_id == thread_uuid)
        .order_by(MessageModel.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Get thread to find request_id
    thread = (
        db.query(MessageThreadModel)
        .filter(MessageThreadModel.id == thread_uuid)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Check if mester has purchased the lead
    has_purchased_lead = False
    if viewer_type == "mester" and mester_id:
        mester_uuid = _validate_uuid(mester_id, "mester_id")
        purchase = (
            db.query(LeadPurchase)
            .filter(
                LeadPurchase.mester_id == mester_uuid,
                LeadPurchase.request_id == thread.request_id,
            )
            .first()
        )
        has_purchased_lead = purchase is not None

    # If the viewer is a mester, determine which messages should be blurred
    # UNLESS they have purchased the lead
    first_mester_created_at = None
    if viewer_type == "mester" and not has_purchased_lead:
        for m in rows:
            if m.sender_type == "mester":
                first_mester_created_at = m.created_at
                break

    def _should_blur(m: MessageModel) -> bool:
        if viewer_type != "mester":
            return False
        if has_purchased_lead:
            return False
        if first_mester_created_at is None:
            return False
        if m.sender_type == "customer" and m.created_at > first_mester_created_at:
            return True
        return False

    return [
        MessageResponse(
            id=str(m.id),
            thread_id=str(m.thread_id),
            body=m.body,
            sender_type=m.sender_type,
            sender_user_id=str(m.sender_user_id) if m.sender_user_id else None,
            sender_mester_id=str(m.sender_mester_id) if m.sender_mester_id else None,
            is_read_by_customer=m.is_read_by_customer,
            is_read_by_mester=m.is_read_by_mester,
            is_blurred=_should_blur(m),
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
async def send_message(
    thread_id: str,
    payload: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    thread = (
        db.query(MessageThreadModel)
        .filter(MessageThreadModel.id == _validate_uuid(thread_id, "thread_id"))
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    sender_type = (payload.sender_type or "").strip().lower()
    if sender_type not in {"customer", "mester"}:
        raise HTTPException(status_code=400, detail="Invalid sender_type")

    sender_user_uuid = _validate_uuid(payload.sender_user_id, "sender_user_id")
    sender_mester_uuid = _validate_uuid(payload.sender_mester_id, "sender_mester_id")

    if sender_type == "customer":
        # Ensure thread has correct customer if provided
        if (
            sender_user_uuid
            and thread.customer_user_id
            and thread.customer_user_id != sender_user_uuid
        ):
            raise HTTPException(
                status_code=403, detail="Sender does not belong to this thread"
            )
    else:
        # mester
        if not sender_mester_uuid:
            sender_mester_uuid = thread.mester_id
        if sender_mester_uuid != thread.mester_id:
            raise HTTPException(
                status_code=403, detail="Sender does not belong to this thread"
            )

    # Enforce free message limits: customer can send unlimited messages,
    # mester gets 1 free reply until payment is received
    customer_message_count = (
        db.query(MessageModel)
        .filter(
            MessageModel.thread_id == thread.id,
            MessageModel.sender_type == "customer",
        )
        .count()
    )
    mester_message_count = (
        db.query(MessageModel)
        .filter(
            MessageModel.thread_id == thread.id,
            MessageModel.sender_type == "mester",
        )
        .count()
    )

    if sender_type == "mester":
        # Require the customer to have initiated the conversation
        if customer_message_count == 0:
            raise HTTPException(
                status_code=403, detail="Customer must initiate the conversation"
            )

        # Only 1 free message from mester, then require payment
        if mester_message_count >= 1:
            # Check if mester has purchased this lead
            from app.services.stripe_service import StripeService

            stripe_service = StripeService(db)

            has_access = stripe_service.check_lead_access(
                mester_id=sender_mester_uuid, request_id=thread.request_id
            )

            if not has_access:
                # 402 Payment Required to continue the chat
                raise HTTPException(status_code=402, detail="PAYMENT_REQUIRED")
    # Customers have no limit

    msg = MessageModel(
        thread_id=thread.id,
        body=payload.body,
        sender_type=sender_type,
        sender_user_id=sender_user_uuid if sender_type == "customer" else None,
        sender_mester_id=sender_mester_uuid if sender_type == "mester" else None,
        is_read_by_customer=(sender_type == "customer"),
        is_read_by_mester=(sender_type == "mester"),
    )
    db.add(msg)

    # Update thread metadata
    thread.last_message_at = datetime.utcnow()
    thread.last_message_preview = payload.body[:255]
    db.add(thread)

    db.commit()
    db.refresh(msg)
    db.refresh(thread)

    # Trigger notification for new message
    from app.services.notifications import NotificationService
    from app.services.websocket import manager

    notification_service = NotificationService(db)
    try:
        notification = await notification_service.notify_new_message(
            message_id=msg.id,
            background_tasks=background_tasks,
        )
        if notification:
            print(
                f"[MESSAGE] Notification {notification.id} created successfully for message {msg.id}"
            )
        else:
            print(f"[MESSAGE] No notification created for message {msg.id}")
    except Exception as e:
        print(f"[MESSAGE] Error creating notification for message {msg.id}: {e}")
        import traceback

        traceback.print_exc()

    # Broadcast new message via WebSocket
    recipient_id = str(thread.customer_user_id) if sender_type == "mester" else None
    recipient_mester_id = str(thread.mester_id) if sender_type == "customer" else None
    
    # Determine if message should be blurred for mester
    is_blurred_for_mester = False
    if sender_type == "customer" and recipient_mester_id:
        # Check if mester has purchased the lead
        has_purchased_lead = False
        purchase = (
            db.query(LeadPurchase)
            .filter(
                LeadPurchase.mester_id == thread.mester_id,
                LeadPurchase.request_id == thread.request_id,
            )
            .first()
        )
        has_purchased_lead = purchase is not None
        
        if not has_purchased_lead:
            # Check if there was a prior mester message
            first_mester_msg = (
                db.query(MessageModel)
                .filter(
                    MessageModel.thread_id == thread.id,
                    MessageModel.sender_type == "mester",
                )
                .order_by(MessageModel.created_at.asc())
                .first()
            )
            if first_mester_msg and msg.created_at > first_mester_msg.created_at:
                is_blurred_for_mester = True
    
    ws_message = {
        "type": "new_message",
        "data": {
            "id": str(msg.id),
            "thread_id": str(msg.thread_id),
            "body": msg.body,
            "sender_type": msg.sender_type,
            "sender_user_id": str(msg.sender_user_id) if msg.sender_user_id else None,
            "sender_mester_id": str(msg.sender_mester_id) if msg.sender_mester_id else None,
            "is_blurred": is_blurred_for_mester,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
    }
    
    try:
        if recipient_id:
            # Customer always sees full message
            customer_message = ws_message.copy()
            customer_message["data"] = ws_message["data"].copy()
            customer_message["data"]["is_blurred"] = False
            await manager.send_to_user(recipient_id, customer_message)
        if recipient_mester_id:
            await manager.send_to_mester(recipient_mester_id, ws_message)
    except Exception as e:
        print(f"[WEBSOCKET] Error broadcasting message: {e}")

    return MessageResponse(
        id=str(msg.id),
        thread_id=str(msg.thread_id),
        body=msg.body,
        sender_type=msg.sender_type,
        sender_user_id=str(msg.sender_user_id) if msg.sender_user_id else None,
        sender_mester_id=str(msg.sender_mester_id) if msg.sender_mester_id else None,
        is_read_by_customer=msg.is_read_by_customer,
        is_read_by_mester=msg.is_read_by_mester,
        created_at=msg.created_at,
    )


@router.post("/threads/{thread_id}/read")
def mark_read(
    thread_id: str,
    reader_type: str = Query(..., pattern="^(customer|mester)$"),
    db: Session = Depends(get_db),
):
    thread_uuid = _validate_uuid(thread_id, "thread_id")
    # Mark all messages in thread as read for the other party
    if reader_type == "customer":
        db.query(MessageModel).filter(MessageModel.thread_id == thread_uuid).update(
            {MessageModel.is_read_by_customer: True}
        )
    else:
        db.query(MessageModel).filter(MessageModel.thread_id == thread_uuid).update(
            {MessageModel.is_read_by_mester: True}
        )
    db.commit()
    return {"ok": True}
