#!/usr/bin/env python3
"""
Seed concise, service-specific question sets for all services.

Rules:
- Create exactly one published QuestionSet per Service that lacks one
- 5–8 diverse, applicable questions per service
- Keep questions simple and fast to answer; avoid overwhelming the client

Usage:
  python api/scripts/seed_question_sets.py
"""

from __future__ import annotations

import os
import sys
import uuid
from typing import Any, Dict, List, Optional, Tuple
import json

from sqlalchemy.orm import Session, sessionmaker, joinedload
from sqlalchemy import func

# Ensure we can import app modules when script is executed directly
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def get_or_create_published_set(db: Session, models: Any, service: Any) -> Optional[Any]:
    """Return existing published set or None if none exists for the service."""
    existing = (
        db.query(models.QuestionSet)
        .filter(
            models.QuestionSet.service_id == service.id,
            models.QuestionSet.status == models.QuestionSetStatus.PUBLISHED,
            models.QuestionSet.is_active.is_(True),
        )
        .order_by(models.QuestionSet.version.desc())
        .first()
    )
    return existing


def next_version_for_service(db: Session, models: Any, service_id: uuid.UUID) -> int:
    max_version = (
        db.query(func.max(models.QuestionSet.version))
        .filter(models.QuestionSet.service_id == service_id)
        .scalar()
    )
    return (max_version or 0) + 1


def build_questions_for_service(models: Any, service_name: str, category_name: Optional[str], subcategory_name: Optional[str], per_service_templates: Optional[Dict[str, Any]] = None) -> Tuple[str, str, List[Dict[str, Any]]]:
    """Return (set_name, description, questions) tailored for the service.

    Ensures 5–8 diverse questions total, using category/subcategory and name keywords.
    """
    name_lower = service_name.lower()
    cat = (category_name or "").lower()
    sub = (subcategory_name or "").lower()

    def q(
        key: str,
        label: str,
        qtype: Any,
        *,
        is_required: bool = True,
        description: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        sort_order: int = 0,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
    ) -> Dict[str, Any]:
        return {
            "key": key,
            "label": label,
            "description": description,
            "question_type": qtype,
            "is_required": is_required,
            "options": options,
            "sort_order": sort_order,
            "min_value": min_value,
            "max_value": max_value,
            "min_length": min_length,
            "max_length": max_length,
        }

    set_name = "Basic Intake"
    set_desc = "Quick questions to understand your job. Takes under 2 minutes."
    questions: List[Dict[str, Any]] = []

    # Per-service JSON template override (highest precedence)
    if per_service_templates:
        tmpl = per_service_templates.get(name_lower)
        if tmpl and isinstance(tmpl, dict):
            q_items: List[Dict[str, Any]] = []
            for idx, qi in enumerate(tmpl.get("questions", []), start=1):
                qt = qi.get("question_type")
                # map string to enum
                try:
                    qt_enum = getattr(models.QuestionType, str(qt).upper()) if isinstance(qt, str) else qt
                except AttributeError:
                    qt_enum = models.QuestionType.TEXT
                q_items.append({
                    "key": qi.get("key", f"q_{idx}"),
                    "label": qi.get("label", "Question"),
                    "description": qi.get("description"),
                    "question_type": qt_enum,
                    "is_required": bool(qi.get("is_required", True)),
                    "options": qi.get("options"),
                    "sort_order": int(qi.get("sort_order", idx * 10)),
                    "min_value": qi.get("min_value"),
                    "max_value": qi.get("max_value"),
                    "min_length": qi.get("min_length"),
                    "max_length": qi.get("max_length"),
                })
            set_name = tmpl.get("name", f"{service_name} Details")
            set_desc = tmpl.get("desc", "Quick intake tailored to this service.")
            # Enforce bounds
            while len(q_items) < 5:
                q_items.append({
                    "key": f"extra_{len(q_items)}",
                    "label": "Additional details (optional)",
                    "description": None,
                    "question_type": models.QuestionType.TEXT,
                    "is_required": False,
                    "options": None,
                    "sort_order": 90 + len(q_items),
                    "min_value": None,
                    "max_value": None,
                    "min_length": None,
                    "max_length": 300,
                })
            if len(q_items) > 8:
                q_items = q_items[:8]
            return set_name, set_desc, q_items

    # Highly tailored service-pattern overrides (wins over category/subcategory)
    if any(term in name_lower for term in ["toilet", "wc"]) or sub == "toilet repair":
        set_name = "Toilet Repair Details"
        set_desc = "Specifics to resolve toilet issues quickly."
        questions = [
            q("symptom", "Main issue", models.QuestionType.SELECT, options={"choices": [
                "Won't flush", "Running", "Leaking", "Clogged", "Loose", "Other"
            ]}, sort_order=10),
            q("age", "Approximate age (years)", models.QuestionType.NUMBER, is_required=False, min_value=0, max_value=50, sort_order=20),
            q("brand", "Brand/model (if known)", models.QuestionType.TEXT, is_required=False, max_length=120, sort_order=30),
            q("access", "Accessible space around toilet?", models.QuestionType.BOOLEAN, is_required=False, sort_order=40),
            q("notes", "Photos or extra notes (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        return set_name, set_desc, questions

    if any(term in name_lower for term in ["lighting", "light install", "lamp"]) or sub == "lighting installation":
        set_name = "Lighting Installation Details"
        set_desc = "Details to prepare tools and mounting hardware."
        questions = [
            q("fixture_type", "Fixture type", models.QuestionType.SELECT, options={"choices": [
                "Ceiling light", "Pendant", "Chandelier", "Wall sconce", "Outdoor"
            ]}, sort_order=10),
            q("ceiling_height", "Ceiling height over 3m?", models.QuestionType.BOOLEAN, sort_order=20),
            q("existing", "Replacing existing or new location?", models.QuestionType.SELECT, options={"choices": [
                "Replace existing", "New location"
            ]}, sort_order=30),
            q("count", "How many fixtures?", models.QuestionType.SELECT, options={"choices": [
                "1", "2-3", "4-6", "7+"
            ]}, sort_order=40),
            q("notes", "Special instructions (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        return set_name, set_desc, questions

    # Category/subcategory aware templates, with keyword fallback
    if "plumbing" in (cat + " " + sub) or any(k in name_lower for k in ["plumb", "pipe", "drain", "toilet", "bathroom"]):
        set_name = "Plumbing Job Details"
        questions = [
            q("job_type", "What type of plumbing issue?", models.QuestionType.SELECT, options={"choices": [
                "Leak", "Clog/Slow drain", "No water", "Install/Replace fixture", "Other"
            ]}, sort_order=10),
            q("fixture", "Which fixture or area is affected?", models.QuestionType.SELECT, options={"choices": [
                "Toilet", "Sink", "Shower/Bath", "Kitchen", "Whole home", "Other"
            ]}, sort_order=20),
            q("urgency", "How urgent is this?", models.QuestionType.SELECT, options={"choices": [
                "Emergency (actively leaking)", "Today/Within 24h", "This week", "Flexible"
            ]}, sort_order=30),
            q("access", "Will the area be accessible on arrival?", models.QuestionType.BOOLEAN, sort_order=40),
            q("age", "Approximate age of the plumbing or fixture (years)?", models.QuestionType.NUMBER, is_required=False, min_value=0, max_value=100, sort_order=50),
            q("details", "Anything else the pro should know?", models.QuestionType.TEXT, is_required=False, min_length=0, max_length=500, sort_order=60),
        ]
        set_desc = "Focused plumbing questions to route the right pro."

    elif "electrical" in (cat + " " + sub) or any(k in name_lower for k in ["electr", "outlet", "light", "wiring", "breaker"]):
        set_name = "Electrical Job Details"
        questions = [
            q("job_type", "What electrical service do you need?", models.QuestionType.SELECT, options={"choices": [
                "Install/Replace fixture", "Fix outlet/switch", "Wiring issue", "Breaker issue", "Other"
            ]}, sort_order=10),
            q("scope", "How many fixtures/outlets are involved?", models.QuestionType.SELECT, options={"choices": [
                "1", "2-3", "4-6", "7+"
            ]}, sort_order=20),
            q("power", "Is power currently on at the site?", models.QuestionType.BOOLEAN, sort_order=30),
            q("urgency", "How soon do you need this done?", models.QuestionType.SELECT, options={"choices": [
                "Today/24h", "This week", "Flexible"
            ]}, sort_order=40),
            q("details", "Provide any additional context (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        set_desc = "Quick electrical intake to match you with the right pro."

    elif any(k in (cat + " " + sub) for k in ["hvac", "heating", "cooling"]) or any(k in name_lower for k in ["hvac", "heating", "cooling", "air", "furnace", "ac", "climate"]):
        set_name = "HVAC Job Details"
        questions = [
            q("system", "Which system?", models.QuestionType.SELECT, options={"choices": [
                "AC", "Heating", "Ventilation", "Heat pump", "Other"
            ]}, sort_order=10),
            q("need", "What do you need?", models.QuestionType.SELECT, options={"choices": [
                "Repair", "Maintenance", "Install/Replace"
            ]}, sort_order=20),
            q("no_cool_heat", "Is the system currently not cooling/heating as expected?", models.QuestionType.BOOLEAN, sort_order=30),
            q("age", "Approximate system age (years)", models.QuestionType.NUMBER, is_required=False, min_value=0, max_value=40, sort_order=40),
            q("details", "Additional details (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        set_desc = "Short HVAC intake for fast diagnosis and scheduling."

    elif any(k in (cat + " " + sub) for k in ["clean", "janitor"]) or any(k in name_lower for k in ["clean", "housekeep", "maid", "janitor", "carpet", "window"]):
        set_name = "Cleaning Job Details"
        questions = [
            q("type", "What type of cleaning?", models.QuestionType.SELECT, options={"choices": [
                "Standard", "Deep", "Move-in/Move-out", "Carpet/Upholstery", "Windows"
            ]}, sort_order=10),
            q("rooms", "Approximate size of the job", models.QuestionType.SELECT, options={"choices": [
                "Studio/1 BR", "2-3 BR", "4+ BR", "Office/Commercial"
            ]}, sort_order=20),
            q("frequency", "Is this a one-time or recurring service?", models.QuestionType.SELECT, options={"choices": [
                "One-time", "Weekly", "Bi-weekly", "Monthly"
            ]}, sort_order=30),
            q("pets", "Any pets at home?", models.QuestionType.BOOLEAN, is_required=False, sort_order=40),
            q("supplies", "Should the pro bring supplies?", models.QuestionType.SELECT, options={"choices": [
                "Yes", "No", "Either"
            ]}, sort_order=50),
            q("details", "Any areas that need special attention? (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=60),
        ]
        set_desc = "Essential cleaning details to estimate time and effort."

    elif any(k in (cat + " " + sub) for k in ["moving", "relocation"]) or any(k in name_lower for k in ["move", "mover", "relocat", "packing", "storage"]):
        set_name = "Moving Job Details"
        questions = [
            q("distance", "What kind of move?", models.QuestionType.SELECT, options={"choices": [
                "Within city", "Long distance"
            ]}, sort_order=10),
            q("size", "Home size / move size", models.QuestionType.SELECT, options={"choices": [
                "Studio/1 BR", "2-3 BR", "4+ BR", "Office"
            ]}, sort_order=20),
            q("stairs", "Flights of stairs or elevator?", models.QuestionType.SELECT, options={"choices": [
                "Elevator", "1 flight", "2+ flights", "Ground level"
            ]}, sort_order=30),
            q("packing", "Do you need packing services?", models.QuestionType.BOOLEAN, sort_order=40),
            q("date", "Preferred move date", models.QuestionType.DATE, is_required=False, sort_order=50),
            q("details", "Special items or building restrictions? (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=60),
        ]
        set_desc = "Basic moving details to plan crew and logistics."

    elif any(k in (cat + " " + sub) for k in ["landscap", "garden", "yard"]) or any(k in name_lower for k in ["landscap", "garden", "yard", "lawn", "tree"]):
        set_name = "Landscaping Job Details"
        questions = [
            q("service", "What landscaping service is needed?", models.QuestionType.SELECT, options={"choices": [
                "Mowing/Trimming", "Planting", "Tree work", "Clean-up", "Design"
            ]}, sort_order=10),
            q("size", "Approximate yard size", models.QuestionType.SELECT, options={"choices": [
                "Small", "Medium", "Large"
            ]}, sort_order=20),
            q("access", "Is the yard accessible for equipment?", models.QuestionType.BOOLEAN, sort_order=30),
            q("debris", "Should debris be hauled away?", models.QuestionType.SELECT, options={"choices": [
                "Yes", "No", "Not applicable"
            ]}, sort_order=40),
            q("details", "Additional details (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        set_desc = "Key yard details to prepare the right tools and crew."

    elif any(k in (cat + " " + sub) for k in ["paint"]) or any(k in name_lower for k in ["paint", "painter", "wall", "ceiling"]):
        set_name = "Painting Job Details"
        questions = [
            q("interior_exterior", "Interior or exterior?", models.QuestionType.SELECT, options={"choices": [
                "Interior", "Exterior"
            ]}, sort_order=10),
            q("surface", "Main surfaces to paint", models.QuestionType.SELECT, options={"choices": [
                "Walls", "Ceilings", "Trim/Doors", "Exterior walls", "Other"
            ]}, sort_order=20),
            q("area_size", "Approximate area size", models.QuestionType.SELECT, options={"choices": [
                "Small", "Medium", "Large"
            ]}, sort_order=30),
            q("prep", "Need prep (patching, sanding, priming)?", models.QuestionType.BOOLEAN, sort_order=40),
            q("details", "Color preferences or special instructions (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        set_desc = "Painting essentials to estimate time and materials."

    elif any(k in (cat + " " + sub) for k in ["carpentry", "woodwork"]) or any(k in name_lower for k in ["carpentry", "carpenter", "wood", "cabinet", "deck"]):
        set_name = "Carpentry Job Details"
        questions = [
            q("job_type", "What type of carpentry work?", models.QuestionType.SELECT, options={"choices": [
                "Install/Build", "Repair", "Custom"
            ]}, sort_order=10),
            q("material", "Primary material involved", models.QuestionType.SELECT, options={"choices": [
                "Softwood", "Hardwood", "Composite", "Plywood/MDf", "Unsure"
            ]}, sort_order=20),
            q("finish", "Will finishing (stain/paint) be needed?", models.QuestionType.BOOLEAN, sort_order=30),
            q("details", "Describe dimensions or references (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=40),
        ]
        set_desc = "Carpentry basics to scope skills and materials."

    else:
        # General Handyman / Fallback
        set_name = "Project Details"
        questions = [
            q("category", "Which best describes your project?", models.QuestionType.SELECT, options={"choices": [
                "Repair", "Install/Replace", "Assembly", "Maintenance", "Other"
            ]}, sort_order=10),
            q("location", "Where in your home/business is this?", models.QuestionType.SELECT, options={"choices": [
                "Kitchen", "Bathroom", "Living area", "Bedroom", "Outdoor", "Other"
            ]}, sort_order=20),
            q("quantity", "How many items/areas are involved?", models.QuestionType.SELECT, options={"choices": [
                "1", "2-3", "4-6", "7+"
            ]}, sort_order=30),
            q("urgency", "How soon do you need this done?", models.QuestionType.SELECT, options={"choices": [
                "Today/24h", "This week", "Flexible"
            ]}, sort_order=40),
            q("details", "Anything else the pro should know? (optional)", models.QuestionType.TEXT, is_required=False, max_length=500, sort_order=50),
        ]
        set_desc = "Short intake to route you to the best pro."

    # Ensure diversity and size bounds (5–8). If too short, add generic non-required detail prompts.
    while len(questions) < 5:
        questions.append(
            q(
                f"extra_{len(questions)}",
                "Additional details (optional)",
                models.QuestionType.TEXT,
                is_required=False,
                max_length=300,
                sort_order=90 + len(questions),
            )
        )
    if len(questions) > 8:
        questions = questions[:8]

    return set_name, set_desc, questions


def seed_question_set_for_service(db: Session, models: Any, service: Any, *, force_update: bool = False, per_service_templates: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    existing = get_or_create_published_set(db, models, service)
    if existing and not force_update:
        return None

    set_name, set_desc, questions = build_questions_for_service(
        models,
        service.name,
        getattr(service.category, "name", None),
        getattr(service.subcategory, "name", None),
        per_service_templates,
    )
    version = next_version_for_service(db, models, service.id)

    qset = models.QuestionSet(
        service_id=service.id,
        name=set_name,
        description=set_desc,
        version=version,
        status=models.QuestionSetStatus.PUBLISHED,
        is_active=True,
        sort_order=0,
    )
    db.add(qset)
    db.flush()  # obtain qset.id

    # If forcing update, deactivate previous sets
    if existing and force_update:
        db.query(models.QuestionSet).filter(
            models.QuestionSet.service_id == service.id,
            models.QuestionSet.id != qset.id,
        ).update({models.QuestionSet.is_active: False}, synchronize_session=False)

    # Persist questions with stable sort order
    for idx, qd in enumerate(questions, start=1):
        question = models.Question(
            question_set_id=qset.id,
            key=qd["key"],
            label=qd["label"],
            description=qd.get("description"),
            question_type=qd["question_type"],
            is_required=qd.get("is_required", True),
            options=qd.get("options"),
            min_value=qd.get("min_value"),
            max_value=qd.get("max_value"),
            min_length=qd.get("min_length"),
            max_length=qd.get("max_length"),
            sort_order=qd.get("sort_order", idx * 10),
            is_active=True,
        )
        db.add(question)

    return qset


def main() -> None:
    # Late import of app modules with robust path handling to satisfy linters and runtime
    try:
        import importlib
        sys.path.insert(0, PROJECT_ROOT)
        sys.path.insert(0, os.path.abspath(os.path.join(PROJECT_ROOT, "..")))
        core_db = importlib.import_module("app.core.database")
        models = importlib.import_module("app.models.database")
        engine = getattr(core_db, "engine")
    except Exception as import_err:  # pragma: no cover
        print(f"❌ Failed to import app modules: {import_err}")
        raise
    # Bind engine to SessionLocal
    SessionLocal.configure(bind=engine)
    db: Session = SessionLocal()
    created = 0
    skipped = 0
    try:
        services: List[Any] = (
            db.query(models.Service)
            .options(joinedload(models.Service.category), joinedload(models.Service.subcategory))
            .filter(models.Service.is_active.is_(True))
            .order_by(models.Service.sort_order, models.Service.name)
            .all()
        )
        # CLI flags
        force = any(arg in ("--force-update", "--force", "-f") for arg in sys.argv[1:])
        templates_path = None
        export_missing_path = None
        for i, arg in enumerate(sys.argv[1:]):
            if arg.startswith("--templates="):
                templates_path = arg.split("=", 1)[1]
            elif arg == "--templates" and i + 2 <= len(sys.argv[1:]):
                templates_path = sys.argv[1:][i + 1]
            elif arg.startswith("--export-missing="):
                export_missing_path = arg.split("=", 1)[1]
            elif arg == "--export-missing" and i + 2 <= len(sys.argv[1:]):
                export_missing_path = sys.argv[1:][i + 1]

        per_service_templates: Optional[Dict[str, Any]] = None
        if templates_path and os.path.exists(templates_path):
            with open(templates_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                per_service_templates = {k.lower(): v for k, v in data.get("services", {}).items()}
        if any(arg in ("--report", "-r") for arg in sys.argv[1:]):
            # Report coverage without writing
            have_published = 0
            missing: List[Tuple[str, str]] = []  # (service_id, name)
            for s in services:
                if get_or_create_published_set(db, models, s):
                    have_published += 1
                else:
                    missing.append((str(s.id), s.name))
            total = len(services)
            print(f"📊 Services: total={total}, with_published_sets={have_published}, missing_sets={len(missing)}")
            if missing:
                print("Missing published sets for:")
                for sid, name in missing:
                    print(f" - {name} ({sid})")
            # Optionally export a per-service template scaffold
            if export_missing_path:
                scaffold: Dict[str, Any] = {"services": {}}
                for _sid, name in missing:
                    scaffold["services"][name.lower()] = {
                        "name": f"{name} Details",
                        "desc": "Tailored questions for this service.",
                        "questions": [
                            {"key": "job_type", "label": "What do you need?", "question_type": "SELECT", "options": {"choices": ["Option A", "Option B"]}},
                            {"key": "details", "label": "Anything else?", "question_type": "TEXT", "is_required": False, "max_length": 500}
                        ]
                    }
                with open(export_missing_path, "w", encoding="utf-8") as outf:
                    json.dump(scaffold, outf, ensure_ascii=False, indent=2)
                print(f"📝 Exported template scaffold to {export_missing_path}")
            return

        for service in services:
            existing = get_or_create_published_set(db, models, service)
            if existing and not force:
                skipped += 1
                continue
            qset = seed_question_set_for_service(db, models, service, force_update=force, per_service_templates=per_service_templates)
            if qset is not None:
                created += 1
        db.commit()
        if force:
            print(f"✅ Regenerated question sets. created={created}, skipped(kept existing)={skipped}")
        else:
            print(f"✅ Seeded question sets. created={created}, skipped(existing)={skipped}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding question sets: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()


