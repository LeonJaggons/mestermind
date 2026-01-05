from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models import Project, ProjectMedia, ProProfile
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, pro_profile_id: int, db: Session = Depends(get_db)):
    """Create a new project for a pro profile"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Create project
    db_project = Project(
        pro_profile_id=pro_profile_id,
        title=project.title,
        description=project.description
    )
    db.add(db_project)
    db.flush()  # Get the project ID before adding media
    
    # Add media if provided
    if project.media:
        for media_item in project.media:
            db_media = ProjectMedia(
                project_id=db_project.id,
                media_url=media_item.media_url,
                media_type=media_item.media_type,
                caption=media_item.caption,
                display_order=media_item.display_order
            )
            db.add(db_media)
    
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    pro_profile_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all projects, optionally filtered by pro profile"""
    query = db.query(Project)
    
    if pro_profile_id:
        query = query.filter(Project.pro_profile_id == pro_profile_id)
    
    projects = query.order_by(Project.created_at.desc()).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    """Update a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    if project_update.title is not None:
        project.title = project_update.title
    if project_update.description is not None:
        project.description = project_update.description
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/media", response_model=ProjectResponse)
def add_project_media(
    project_id: int,
    media_url: str,
    media_type: str,
    caption: Optional[str] = None,
    display_order: int = 0,
    db: Session = Depends(get_db)
):
    """Add media to an existing project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if media_type not in ['image', 'video']:
        raise HTTPException(status_code=400, detail="Media type must be 'image' or 'video'")
    
    db_media = ProjectMedia(
        project_id=project_id,
        media_url=media_url,
        media_type=media_type,
        caption=caption,
        display_order=display_order
    )
    db.add(db_media)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_media(project_id: int, media_id: int, db: Session = Depends(get_db)):
    """Delete media from a project"""
    media = db.query(ProjectMedia).filter(
        ProjectMedia.id == media_id,
        ProjectMedia.project_id == project_id
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    db.delete(media)
    db.commit()
    return None
