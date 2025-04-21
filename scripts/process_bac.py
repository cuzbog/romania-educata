import json
from collections import defaultdict, Counter
import numpy as np
import pandas as pd

df = pd.read_excel("../data/2024.09.30_bac_date-deschise_2024-ses1.xlsx")
df_2024 = df[df["Promoție"] == "2023-2024"]

# %%
# Normalize language column
df_2024["Subiect eb normalized"] = (
    df_2024["Subiect eb"].str.extract(r"^(Limba [^\(]+)").squeeze().str.strip()
)
df_2024["Subiect eb normalized"] = df_2024["Subiect eb normalized"].fillna(
    "Limba română"
)

df_2024["Sex"] = df_2024["Sex"].str.lower()

# Language code mapping
lang_map = {
    "Limba română": "RO",
    "Limba maghiară": "HU",
    "Limba germană": "DE",
    "Limba slovacă": "SK",
    "Limba ucraineană": "UA",
    "Limba sârbă": "SR",
    "Limba croată": "HR",
    "Limba turcă": "TR",
    "Limba italiană": "IT",
}
df_2024["lang_code"] = df_2024["Subiect eb normalized"].map(lang_map)

# assert all languages are mapped
if df_2024["lang_code"].isna().any():
    raise ValueError("Some languages are not mapped in lang_map")

# Create empty result dict
bac_json = {}

for (unitate, sex), group in df_2024.groupby(["Unitate (SIIIR)", "Sex"]):
    passed_mask = group["STATUS"] == "Promovat"
    lang_counts = Counter(group["lang_code"])

    if unitate not in bac_json:
        bac_json[unitate] = {
            "f": {},
            "m": {},
            "total": {
                "lang": defaultdict(int),
                "graduating": 0,
                "passed": 0,
                "absent": 0,
                "medie_list": [],
            },
        }

    # Fill current stats
    bac_json[unitate][sex] = {
        "lang": dict(lang_counts),
        "graduating": len(group),
        "passed": passed_mask.sum(),
        "absent": (group["STATUS"] == "Absent").sum(),
        "failed": (group["STATUS"] == "Nepromovat").sum(),
        "mean": (
            round(group.loc[passed_mask, "Medie"].mean(), 2)
            if passed_mask.any()
            else None
        ),
        "std": (
            round(group.loc[passed_mask, "Medie"].std(ddof=0), 2)
            if passed_mask.sum() > 1
            else None
        ),
    }

    # Accumulate into 'total'
    total = bac_json[unitate]["total"]
    for lang, count in lang_counts.items():
        total["lang"][lang] += count
    total["graduating"] += len(group)
    total["passed"] += passed_mask.sum()
    total["absent"] += len(group) - passed_mask.sum()
    total.setdefault("medie_list", []).extend(group.loc[passed_mask, "Medie"].tolist())


# Finalize total mean/std
for data in bac_json.values():
    total = data["total"]
    grades = total.pop("medie_list", [])
    if grades:
        total["mean"] = round(np.mean(grades), 2)
        total["std"] = round(np.std(grades, ddof=0), 2) if len(grades) > 1 else None
    else:
        total["mean"] = None
        total["std"] = None
    total["lang"] = dict(total["lang"])  # convert defaultdict to regular dict

# Save to file
bac_json_str_keys = {str(k): v for k, v in bac_json.items()}


def convert_numpy(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    else:
        return obj


cleaned_data = convert_numpy(bac_json_str_keys)
with open("../data/bac.json", "w", encoding="utf-8") as f:
    json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

# %%
