from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class MessageCreate(MessageBase):
    job_id: int
    receiver_id: int


class MessageResponse(BaseModel):
    id: int
    job_id: int
    sender_id: int
    receiver_id: int
    obfuscated_content: str
    is_read: bool
    is_from_pro: bool
    created_at: datetime
    contains_contact_info: bool = False

    class Config:
        from_attributes = True
