import json
import sys
import uuid
from pathlib import Path
from typing import Dict, Any

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal, create_tables  # noqa: E402
from app.models.database import Category, Subcategory, PriceBand, PriceBandMapping  # noqa: E402


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def seed_price_bands(db) -> None:
    """
    Seed price bands and mappings into the database.
    This function is idempotent and can be called multiple times safely.
    """
    project_root = Path(__file__).resolve().parents[1]
    data_dir = project_root / "data"

    bands_def_path = data_dir / "band_definitions_huf.json"
    mapping_path = data_dir / "bands_by_category_subcategory.json"

    bands_def = load_json(bands_def_path)
    mappings = load_json(mapping_path)

    # 1) Upsert price bands
    bands: Dict[str, Dict[str, Any]] = bands_def["bands"]
    upserted = 0
    for code, info in bands.items():
        existing = db.execute(select(PriceBand).where(PriceBand.code == code)).scalar_one_or_none()
        if existing is None:
            pb = PriceBand(
                id=uuid.uuid4(),
                code=code,
                label=info.get("label", code),
                description=info.get("description"),
                currency=bands_def.get("currency", "HUF"),
                typical_job_value_min_huf=(info.get("typical_job_value_range_huf") or [None, None])[0],
                typical_job_value_max_huf=(info.get("typical_job_value_range_huf") or [None, None])[1],
                typical_close_rate_min=(info.get("typical_close_rate_range") or [None, None])[0],
                typical_close_rate_max=(info.get("typical_close_rate_range") or [None, None])[1],
                target_take_of_expected_value=info.get("target_take_of_expected_value"),
                price_floor_huf=info.get("price_floor_huf"),
                price_cap_huf=info.get("price_cap_huf"),
                seats_per_lead=info.get("seats_per_lead"),
                metadata_json={
                    "exchange_rate_note": bands_def.get("exchange_rate_note"),
                    "rounding_increment_huf": bands_def.get("rounding_increment_huf"),
                },
            )
            db.add(pb)
            upserted += 1
        else:
            existing.label = info.get("label", code)
            existing.description = info.get("description")
            existing.currency = bands_def.get("currency", existing.currency)
            r = info.get("typical_job_value_range_huf") or [None, None]
            existing.typical_job_value_min_huf = r[0]
            existing.typical_job_value_max_huf = r[1]
            cr = info.get("typical_close_rate_range") or [None, None]
            existing.typical_close_rate_min = cr[0]
            existing.typical_close_rate_max = cr[1]
            existing.target_take_of_expected_value = info.get("target_take_of_expected_value")
            existing.price_floor_huf = info.get("price_floor_huf")
            existing.price_cap_huf = info.get("price_cap_huf")
            existing.seats_per_lead = info.get("seats_per_lead")
    db.commit()

    # Build lookup maps for category/subcategory names -> IDs
    categories = db.execute(select(Category)).scalars().all()
    cat_by_name = {c.name: c.id for c in categories}
    subcats = db.execute(select(Subcategory)).scalars().all()
    subcat_by_key = {(s.category_id, s.name): s.id for s in subcats}

    # 2) Insert/update mappings
    missing: list[str] = []
    inserted = 0
    updated = 0

    # Cache bands by code
    bands_in_db = db.execute(select(PriceBand)).scalars().all()
    band_by_code = {b.code: b.id for b in bands_in_db}

    for category_name, subcat_map in mappings.items():
        cat_id = cat_by_name.get(category_name)
        if not cat_id:
            missing.append(f"Category not found: {category_name}")
            continue

        for subcategory_name, code in subcat_map.items():
            sub_id = subcat_by_key.get((cat_id, subcategory_name))
            if not sub_id:
                missing.append(f"Subcategory not found: {category_name} / {subcategory_name}")
                continue

            band_id = band_by_code.get(code)
            if not band_id:
                missing.append(f"Price band code not found: {code} for {category_name}/{subcategory_name}")
                continue

            existing = db.execute(
                select(PriceBandMapping).where(
                    PriceBandMapping.category_id == cat_id,
                    PriceBandMapping.subcategory_id == sub_id,
                )
            ).scalar_one_or_none()

            if existing is None:
                db.add(
                    PriceBandMapping(
                        id=uuid.uuid4(),
                        category_id=cat_id,
                        subcategory_id=sub_id,
                        price_band_id=band_id,
                    )
                )
                inserted += 1
            else:
                if existing.price_band_id != band_id:
                    existing.price_band_id = band_id
                    updated += 1

    db.commit()

    print(f"Upserted price_bands: {upserted}")
    print(f"Inserted mappings: {inserted}, Updated mappings: {updated}")
    if missing:
        print("Missing references:")
        for m in missing:
            print(f" - {m}")


def main() -> None:
    db = SessionLocal()
    try:
        # Ensure tables exist (idempotent)
        create_tables()
        seed_price_bands(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()


