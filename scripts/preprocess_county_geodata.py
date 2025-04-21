import json
from collections import defaultdict

with open("data/ro_uat_poligon.geojson", "r", encoding="utf-8") as f:
    full_geojson = json.load(f)

# Group features by county mnemonic
features_by_county = defaultdict(list)

for feature in full_geojson["features"]:
    county = feature["properties"]["countyMn"]
    features_by_county[county].append(feature)

# Write one GeoJSON per county
for county_code, features in features_by_county.items():
    sliced = {"type": "FeatureCollection", "features": features}
    with open(f"data/adm2/{county_code}.geojson", "w", encoding="utf-8") as f:
        json.dump(sliced, f, ensure_ascii=False)
