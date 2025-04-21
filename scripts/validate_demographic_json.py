import os
import json
import glob

# Define the path to the demographics data directory
demographics_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "demographics"
)

# Define the path to the adm2 geojson directory
adm2_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "adm2"
)


def load_geojson(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Warning: GeoJSON file not found: {filepath}")
        return None
    except Exception as e:
        print(f"Error loading GeoJSON file {filepath}: {e}")
        return None


def extract_place_names(geojson_data):
    if not geojson_data or "features" not in geojson_data:
        return set()

    place_names = set()
    for feature in geojson_data["features"]:
        if "properties" in feature and "name" in feature["properties"]:
            name = feature["properties"]["name"]
            if name:
                place_names.add(name)

    return place_names


# Find all JSON files in the demographics directory
json_files = glob.glob(os.path.join(demographics_dir, "*.json"))

validation_results = {
    "counties_processed": 0,
    "cities_validated": 0,
    "cities_missing": 0,
    "missing_details": [],
}

# Loop through each JSON file
for json_file in json_files:
    filename = os.path.basename(json_file)
    county_name = filename.split(".")[0]

    # Skip files that don't follow the two-letter county code pattern
    if not (len(county_name) == 2 and filename.endswith(".json")) or filename in [
        "ROU.json",
        "B.json",
    ]:
        print(f"Skipping file: {filename}")
        continue

    validation_results["counties_processed"] += 1

    # Read the JSON file
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Load the corresponding county GeoJSON
        county_geojson_path = os.path.join(adm2_dir, f"{county_name}.geojson")
        geojson_data = load_geojson(county_geojson_path)

        if not geojson_data:
            print(f"Error: Could not load GeoJSON for county {county_name}")
            continue

        # Extract valid place names from GeoJSON
        valid_places = extract_place_names(geojson_data)

        # Validate cities in demographic data
        if "cities" in data:
            for city in data["cities"]:
                validation_results["cities_validated"] += 1
                city_name = city.get("name", "")

                if city_name not in valid_places:
                    validation_results["cities_missing"] += 1
                    validation_results["missing_details"].append(
                        {"county": county_name, "city": city_name}
                    )
                    print(
                        f"  Warning: City '{city_name}' not found in {county_name}.geojson"
                    )

    except json.JSONDecodeError as e:
        print(f"Error parsing JSON in {json_file}: {e}")
    except Exception as e:
        print(f"Error processing {json_file}: {e}")

print("\nValidation Summary:")
print(f"Counties processed: {validation_results['counties_processed']}")
print(f"Cities validated: {validation_results['cities_validated']}")
print(f"Cities missing: {validation_results['cities_missing']}")

if validation_results["missing_details"]:
    print("\nMissing cities by county:")
    current_county = None
    for item in sorted(
        validation_results["missing_details"], key=lambda x: (x["county"], x["city"])
    ):
        if current_county != item["county"]:
            current_county = item["county"]
            print(f"\n{current_county}:")
        print(f"  - {item['city']}")
