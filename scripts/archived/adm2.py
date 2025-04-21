import pandas as pd
import json
from pathlib import Path

# Load school data
df = pd.read_csv("data/retea-scolara-2024-2025.csv")

# Process each county
counties = df["Judet PJ"].unique()

for county in counties:
    # Filter data for this county
    county_df = df[df["Judet PJ"] == county]

    # Group by locality to get school counts
    locality_counts = (
        county_df.groupby("Localitate PJ").size().reset_index(name="num_schools")
    )

    # Load county-specific GeoJSON (assuming naming convention)
    geojson_path = f"data/adm2/{county}.geojson"

    try:
        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson = json.load(f)

        # Inject school count into each feature
        for feature in geojson["features"]:
            locality_name = feature["properties"].get("name")
            row = locality_counts[locality_counts["Localitate PJ"] == locality_name]
            feature["properties"]["num_schools"] = (
                int(row["num_schools"]) if not row.empty else 0
            )

        # Save updated GeoJSON
        output_path = f"data/adm2/{county}-schools.geojson"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        print(f"Generated {output_path}")

    except FileNotFoundError:
        print(f"Warning: GeoJSON file for {county} not found at {geojson_path}")
    except Exception as e:
        print(f"Error processing {county}: {str(e)}")

print("Processing complete.")
