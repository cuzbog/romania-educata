import pandas as pd
import json

# Load your school data
df = pd.read_csv("data/retea-scolara-2024-2025.csv")
df_county = df.groupby("Judet PJ").size().reset_index(name="num_schools")

# Load GeoJSON
with open("data/ro_judete_poligon.geojson", "r", encoding="utf-8") as f:
    geojson = json.load(f)

# Inject school count into each feature
for feature in geojson["features"]:
    code = feature["properties"]["mnemonic"]
    row = df_county[df_county["Judet PJ"] == code]
    feature["properties"]["num_schools"] = (
        int(row["num_schools"]) if not row.empty else 0
    )

# Save updated GeoJSON
with open("data/adm1-schools.geojson", "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)
