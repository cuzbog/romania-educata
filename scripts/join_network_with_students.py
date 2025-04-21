import pandas as pd
import json

network_df = pd.read_csv("../data/retea-scolara-2024-2025.csv")
students_df = pd.read_excel("../data/elevi-inmatriculati-2024-2025.xlsx")


def normalize_diacritics(text):
    if not isinstance(text, str):
        return text
    # Replace common incorrect diacritics with proper Romanian ones
    replacements = {
        "ş": "ș",  # replace cedilla with comma
        "Ş": "Ș",
        "ţ": "ț",
        "Ţ": "Ț",
        "š": "ș",
    }

    for wrong, correct in replacements.items():
        text = text.replace(wrong, correct)

    return text


# apply normalization to all string columns
for col in students_df.select_dtypes(include=["object"]).columns:
    students_df[col] = students_df[col].apply(normalize_diacritics)

for col in network_df.select_dtypes(include=["object"]).columns:
    network_df[col] = network_df[col].apply(normalize_diacritics)

students_df = students_df.rename(
    columns={
        "Cod unitate PJ": "cod_siiir_pj",
        "Cod Unitate Plan": "cod_siiir_unitate",
        "Nivel": "nivel_invatamant",
        "Limba predare": "limba_de_predare",
        "Elevi exist anterior-asoc": "numar_elevi",
    }
)


# Simplify limba_de_predare column by removing the word 'Limba'
def simplify_limba(lang):
    if isinstance(lang, str) and lang.startswith("Limba "):
        return lang.replace("Limba ", "").lower()
    return lang


students_df["limba_de_predare"] = students_df["limba_de_predare"].apply(simplify_limba)

students_df["cod_siiir_unitate"] = students_df["cod_siiir_unitate"].astype(str)

network_df["Cod SIIIR unitate"] = network_df["Cod SIIIR unitate"].astype(str)
network_df = network_df.rename(columns={"Cod SIIIR unitate": "cod_siiir_unitate"})

student_counts = (
    students_df.groupby("cod_siiir_unitate")["numar_elevi"].sum().reset_index()
)

langs_levels = (
    students_df.groupby("cod_siiir_unitate")
    .agg(
        {
            "limba_de_predare": lambda x: sorted(set(x.dropna())),
            "nivel_invatamant": lambda x: sorted(set(x.dropna())),
        }
    )
    .reset_index()
)

num_classes = (
    students_df.groupby("cod_siiir_unitate")["numar_elevi"].count().reset_index()
)
num_classes = num_classes.rename(
    columns={"numar_elevi": "numar_formatiuni"}
)  # optional

from functools import reduce

# Merge all
dfs_to_merge = [student_counts, langs_levels, num_classes]
unit_agg = reduce(
    lambda l, r: pd.merge(l, r, on="cod_siiir_unitate", how="outer"), dfs_to_merge
)


# Merge into network data
unit_full = network_df.merge(unit_agg, on="cod_siiir_unitate", how="left")
unit_full.to_csv("../data/aggregated.csv", index=False)

# Filter out rows with 0 or missing subunits
filtered = unit_full[unit_full["numar_formatiuni"].fillna(0) > 0].copy()
grouped = filtered.groupby("Judet PJ")


# Define a custom function to handle NaN values
def nan_to_null(obj):
    if isinstance(obj, float) and pd.isna(obj):
        return None
    return obj


county_data = {}
for judet, group in grouped:
    records = group.drop(columns=["Judet PJ"]).to_dict(orient="records")
    for record in records:
        for key, value in record.items():
            record[key] = nan_to_null(value)
    county_data[judet] = records

# Save
pj_json_path = "../data/schools_by_county.json"
with open(pj_json_path, "w", encoding="utf-8") as f:
    json.dump(county_data, f, ensure_ascii=False, indent=None)

"""
conflicting_mediu = (
    network_df.groupby("Localitate unitate")["Mediu loc. unitate"]
    .nunique()
    .reset_index()
)

conflicting_mediu = conflicting_mediu[
    conflicting_mediu["Mediu loc. unitate"] > 1
]

print("Towns with inconsistent 'Mediu' values:")

ALL are either "urban" or "rural"
"""
