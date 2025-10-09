import json
from collections import defaultdict
from pathlib import Path


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    data_dir = project_root / "data"
    source_path = data_dir / "mestermind-services-taxonomy.json"

    with source_path.open("r", encoding="utf-8") as f:
        records = json.load(f)

    categories_set = set()
    category_to_subcategories: dict[str, set[str]] = defaultdict(set)

    for record in records:
        category = record.get("category")
        subcategory = record.get("subcategory")
        if not category:
            continue
        categories_set.add(category)
        if subcategory:
            category_to_subcategories[category].add(subcategory)

    categories = sorted(categories_set)
    subcategories_by_category = {
        category: sorted(list(subcats)) for category, subcats in category_to_subcategories.items()
    }

    # Write outputs
    categories_path = data_dir / "categories.json"
    subcats_path = data_dir / "subcategories_by_category.json"

    with categories_path.open("w", encoding="utf-8") as f:
        json.dump(categories, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with subcats_path.open("w", encoding="utf-8") as f:
        json.dump(subcategories_by_category, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()



