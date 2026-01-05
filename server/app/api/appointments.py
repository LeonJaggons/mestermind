from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.job import Job
from app.models.user import User
from app.models.pro_profile import ProProfile
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.utils import notifications

router = APIRouter()


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    """Create a new appointment"""
    # Verify job exists
    job = db.query(Job).filter(Job.id == appointment.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify customer exists
    customer = db.query(User).filter(User.id == appointment.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == appointment.pro_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Create appointment
    db_appointment = Appointment(
        job_id=appointment.job_id,
        customer_id=appointment.customer_id,
        pro_id=appointment.pro_id,
        service_category=appointment.service_category,
        appointment_date=appointment.appointment_date,
        appointment_start_time=appointment.appointment_start_time,
        estimated_duration_minutes=appointment.estimated_duration_minutes,
        time_flexibility=appointment.time_flexibility,
        address_line1=appointment.address_line1,
        address_line2=appointment.address_line2,
        city=appointment.city,
        postal_code=appointment.postal_code,
        access_note=appointment.access_note,
        pricing_type=appointment.pricing_type,
        quoted_amount_huf=appointment.quoted_amount_huf,
        hourly_rate_huf=appointment.hourly_rate_huf,
        min_hours=appointment.min_hours,
        price_note=appointment.price_note,
        status=AppointmentStatus.pending_customer_confirmation,
        notify_customer_by_sms=appointment.notify_customer_by_sms,
        notify_customer_by_email=appointment.notify_customer_by_email,
        reminder_minutes_before=appointment.reminder_minutes_before,
        pro_internal_note=appointment.pro_internal_note,
    )
    
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    # Send notification to customer
    try:
        if customer.firebase_uid and pro_profile.user and pro_profile.user.firebase_uid:
            notifications.notify_appointment_created(
                customer_id=customer.id,
                customer_firebase_uid=customer.firebase_uid,
                pro_id=pro_profile.id,
                pro_firebase_uid=pro_profile.user.firebase_uid,
                appointment_id=db_appointment.id,
                appointment_date=db_appointment.appointment_date,
                appointment_time=db_appointment.appointment_start_time,
                pro_business_name=pro_profile.business_name or "A professional",
                customer_email=customer.email
            )
    except Exception as e:
        # Don't fail the request if notification fails
        print(f"Failed to send appointment created notification: {e}")
    
    return db_appointment


@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    job_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    pro_id: Optional[int] = None,
    status: Optional[AppointmentStatus] = None,
    db: Session = Depends(get_db)
):
    """Get appointments with optional filters"""
    query = db.query(Appointment)
    
    if job_id:
        query = query.filter(Appointment.job_id == job_id)
    if customer_id:
        query = query.filter(Appointment.customer_id == customer_id)
    if pro_id:
        query = query.filter(Appointment.pro_id == pro_id)
    if status:
        query = query.filter(Appointment.status == status)
    
    return query.order_by(Appointment.appointment_date, Appointment.appointment_start_time).all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Get a specific appointment by ID"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    """Update an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    old_status = appointment.status
    update_data = appointment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    # Send notifications for status changes
    try:
        customer = db.query(User).filter(User.id == appointment.customer_id).first()
        pro_profile = db.query(ProProfile).filter(ProProfile.id == appointment.pro_id).first()
        
        if customer and pro_profile and pro_profile.user:
            customer_name = f"{customer.email}"  # Could enhance with customer profile name
            pro_name = pro_profile.business_name or "A professional"
            
            # Status changed to confirmed
            if old_status != AppointmentStatus.confirmed and appointment.status == AppointmentStatus.confirmed:
                if customer.firebase_uid and pro_profile.user.firebase_uid:
                    notifications.notify_appointment_confirmed(
                        pro_id=pro_profile.id,
                        pro_firebase_uid=pro_profile.user.firebase_uid,
                        customer_id=customer.id,
                        customer_firebase_uid=customer.firebase_uid,
                        appointment_id=appointment.id,
                        appointment_date=appointment.appointment_date,
                        appointment_time=appointment.appointment_start_time,
                        customer_name=customer_name
                    )
            
            # Status changed to cancelled
            elif old_status != AppointmentStatus.cancelled and appointment.status == AppointmentStatus.cancelled:
                if customer.firebase_uid and pro_profile.user.firebase_uid:
                    # Determine who cancelled (this is a simplification - you might want to track this better)
                    cancelled_by = "customer"  # Could be enhanced to track actual canceller
                    notifications.notify_appointment_cancelled(
                        pro_id=pro_profile.id,
                        pro_firebase_uid=pro_profile.user.firebase_uid,
                        customer_id=customer.id,
                        customer_firebase_uid=customer.firebase_uid,
                        appointment_id=appointment.id,
                        cancelled_by=cancelled_by,
                        appointment_date=appointment.appointment_date,
                        appointment_time=appointment.appointment_start_time
                    )
            
            # Status changed to completed
            elif old_status != AppointmentStatus.completed and appointment.status == AppointmentStatus.completed:
                if customer.firebase_uid and pro_profile.user.firebase_uid:
                    notifications.notify_appointment_completed(
                        pro_id=pro_profile.id,
                        pro_firebase_uid=pro_profile.user.firebase_uid,
                        customer_id=customer.id,
                        customer_firebase_uid=customer.firebase_uid,
                        appointment_id=appointment.id,
                        appointment_date=appointment.appointment_date
                    )
    except Exception as e:
        # Don't fail the request if notification fails
        print(f"Failed to send appointment status change notification: {e}")
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Delete an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(appointment)
    db.commit()
    
    return None

