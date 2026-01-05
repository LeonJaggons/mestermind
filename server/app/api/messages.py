from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.message import Message
from app.models.job import Job
from app.models.user import User
from app.models.pro_profile import ProProfile
from app.schemas.message import MessageCreate, MessageResponse
from app.utils.contact_obfuscator import ContactObfuscator
from app.utils import notifications

router = APIRouter()


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(message: MessageCreate, sender_id: int, db: Session = Depends(get_db)):
    """Create a new message with contact information obfuscation"""
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == message.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify sender exists
    sender = db.query(User).filter(User.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    # Determine if sender is a pro
    pro_profile = db.query(ProProfile).filter(ProProfile.user_id == sender_id).first()
    is_from_pro = pro_profile is not None
    
    # Obfuscate contact information
    obfuscated_content, contains_contact = ContactObfuscator.obfuscate(message.content)
    
    # Create message
    db_message = Message(
        job_id=message.job_id,
        sender_id=sender_id,
        receiver_id=message.receiver_id,
        original_content=message.content,
        obfuscated_content=obfuscated_content,
        is_from_pro=is_from_pro
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Send notification to receiver
    try:
        if receiver.firebase_uid:
            sender_name = "A professional" if is_from_pro else "A customer"
            # Try to get better sender name
            if is_from_pro and pro_profile:
                sender_name = pro_profile.business_name or sender_name
            else:
                # Could enhance with customer profile name
                sender_name = sender.email.split("@")[0] if sender.email else sender_name
            
            # Determine if receiver is customer (not a pro)
            receiver_pro = db.query(ProProfile).filter(ProProfile.user_id == message.receiver_id).first()
            is_receiver_customer = receiver_pro is None
            
            print(f"[NOTIFY] Sending message notification:")
            print(f"  - From: {sender_name} (pro={is_from_pro})")
            print(f"  - To: {receiver.email} (customer={is_receiver_customer})")
            print(f"  - Firebase UID: {receiver.firebase_uid}")
            print(f"  - Job ID: {message.job_id}")
            
            notifications.notify_new_message(
                recipient_id=receiver.id,
                recipient_firebase_uid=receiver.firebase_uid,
                sender_name=sender_name,
                conversation_id=message.job_id,  # Using job_id as conversation identifier
                is_customer=is_receiver_customer,
                recipient_email=receiver.email
            )
            print(f"[NOTIFY] Message notification sent successfully")
    except Exception as e:
        print(f"[NOTIFY ERROR] Failed to send new message notification: {e}")
        import traceback
        traceback.print_exc()
    
    # Add contains_contact_info to response
    response_data = MessageResponse.model_validate(db_message)
    response_data.contains_contact_info = contains_contact
    
    return response_data


@router.get("/", response_model=List[MessageResponse])
def get_messages(
    job_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get messages with optional filters"""
    query = db.query(Message)
    
    if job_id:
        query = query.filter(Message.job_id == job_id)
    
    if user_id:
        query = query.filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        )
    
    messages = query.order_by(Message.created_at.asc()).all()
    
    # Convert to response models
    response_messages = []
    for msg in messages:
        response_data = MessageResponse.model_validate(msg)
        # Check if original had contact info
        _, contains_contact = ContactObfuscator.obfuscate(msg.original_content)
        response_data.contains_contact_info = contains_contact
        response_messages.append(response_data)
    
    return response_messages


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(message_id: int, db: Session = Depends(get_db)):
    """Get a specific message by ID"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    response_data = MessageResponse.model_validate(message)
    _, contains_contact = ContactObfuscator.obfuscate(message.original_content)
    response_data.contains_contact_info = contains_contact
    
    return response_data


@router.put("/{message_id}/read", response_model=MessageResponse)
@router.patch("/{message_id}/read", response_model=MessageResponse)
def mark_message_read(message_id: int, db: Session = Depends(get_db)):
    """Mark a message as read"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    db.commit()
    db.refresh(message)
    
    response_data = MessageResponse.model_validate(message)
    _, contains_contact = ContactObfuscator.obfuscate(message.original_content)
    response_data.contains_contact_info = contains_contact
    
    return response_data


@router.get("/unread-count/{user_id}")
def get_unread_count(user_id: int, db: Session = Depends(get_db)):
    """Get the count of unread messages for a user"""
    unread_count = db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_read == False
    ).count()
    
    return {"unread_count": unread_count}
