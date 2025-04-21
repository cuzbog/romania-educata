import pandas as pd
import json
from pathlib import Path
import re

manual_corrections = {
    ("BH", "Mădăraș"): "Mădăras",
    ("BT", "Flamânzi"): "Flămânzi",
    ("CJ", "Ășchileu Mare"): "Așchileu Mare",
    ("CJ", "Rișca"): "Râșca",
    ("GL", "Vărlezi"): "Vârlezi",
    ("IS", "Țigănăși"): "Țigănași",
    ("NT", "Bârgauani"): "Bârgăuani",
    ("NT", "Cândesti"): "Cândești",
    ("NT", "Mânăstirea Neamț"): "Mănăstirea Neamț",
    ("OT", "Pîrșcoveni"): "Pârșcoveni",
    ("TR", "Rosiori de Vede"): "Roșiori de Vede",
    ("DB", "Valea Voivozilor"): "Valea Voievozilor",
    ("GR", "Neajlov"): "Neajlovu",
    ("SJ", "Cristur Crișeni"): "Cristur-Crișeni",
    ("CJ", "Ășchileu Mic"): "Așchileu Mic",
    ("DJ", "Răcarii de Jos"): "Răcari",
}


def normalize_names(text):
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

    text = text.title().strip()

    # Fix prepositions to be lowercase when they're not at the beginning
    prepositions = ["De", "La", "Din", "Lui", "Pe", "Cu", "În", "Sub", "Cel"]
    for prep in prepositions:
        # Replace only when not at the beginning of the text
        text = re.sub(r"(?<!\A)(?<!\s\()(?<!\-)" + prep + r"\b", prep.lower(), text)

    return text


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
    place_names = set()
    for feature in geojson_data["features"]:
        if "properties" in feature and "name" in feature["properties"]:
            name = feature["properties"]["name"]
            if name:
                place_names.add(name)
        else:
            print(f"Warning: Missing 'properties' or 'name' in feature: {feature}")

    return place_names


def extract_town_mappings(localitati_geojson, county_name):
    """
    Extract mappings from small towns to their commune/municipality (nameSup)
    for a specific county.
    """
    town_mappings = {}

    for feature in localitati_geojson["features"]:
        props = feature.get("properties", {})

        # Skip if not in the target county
        if props.get("countyMn") != county_name:
            continue

        name = props.get("name")
        name_sup = props.get("nameSup")

        if name and name_sup:
            town_mappings[name] = name_sup

    return town_mappings


def validate_county_towns(df, localitati_geojson):
    # Get unique counties
    counties = df["Judet PJ"].unique()

    results = {
        "matched_adm2": 0,
        "matched_via_localitati": 0,
        "unmatched": 0,
        "unmatched_towns": {},
        "town_corrections": [],
    }

    for county in counties:
        county_df = df[df["Judet PJ"] == county]

        # Load GeoJSON data for this county
        geojson_data = load_geojson(Path(f"../data/adm2/{county}.geojson"))

        # Extract place names from GeoJSON
        place_names = extract_place_names(geojson_data)

        # Get village-to-commune mappings from localitati GeoJSON for this county
        town_mappings = extract_town_mappings(localitati_geojson, county)

        # Check each town/village in the county
        towns = county_df["Localitate unitate"].unique()
        unmatched_towns = []

        for town in towns:
            # First try direct match with ADM2
            if town in place_names:
                results["matched_adm2"] += 1
            else:
                # If not found in ADM2, check if it's in localitati and has a parent commune
                parent_commune = town_mappings.get(town)

                if parent_commune and parent_commune in place_names:
                    results["matched_via_localitati"] += 1
                    # Record the correction
                    results["town_corrections"].append(
                        {
                            "County": county,
                            "Original": town,
                            "Corrected": parent_commune,
                        }
                    )
                else:
                    # Check if there's a manual correction for this town
                    manual_correction_key = (county, town)
                    if manual_correction_key in manual_corrections:
                        corrected_town = manual_corrections[manual_correction_key]
                        # Check if the corrected town is in place names
                        if corrected_town in place_names:
                            results["matched_adm2"] += 1
                            results["town_corrections"].append(
                                {
                                    "County": county,
                                    "Original": town,
                                    "Corrected": corrected_town,
                                }
                            )
                            continue
                        # If not, check if it's in localitati
                        corrected_parent_commune = town_mappings.get(corrected_town)
                        if (
                            corrected_parent_commune
                            and corrected_parent_commune in place_names
                        ):
                            results["matched_via_localitati"] += 1
                            results["town_corrections"].append(
                                {
                                    "County": county,
                                    "Original": town,
                                    "Corrected": corrected_parent_commune,
                                }
                            )
                            continue
                    results["unmatched"] += 1
                    unmatched_towns.append(town)

        if unmatched_towns:
            results["unmatched_towns"][county] = unmatched_towns

    return results


def fix_diacritics_case(df):
    """Normalize diacritics and case in all string columns of the dataframe except 'Judet PJ'."""
    str_columns = df.select_dtypes(include=["object"]).columns

    for col in str_columns:
        if col != "Judet PJ":  # Skip normalization for Judet PJ column
            df[col] = df[col].apply(normalize_names)

    return df


def apply_town_corrections(df, corrections):
    """
    Update town names in the dataframe based on corrections list.

    Each correction is a dict with County, Original, and Corrected fields.
    """
    # Create a copy to avoid modifying during iteration
    df_copy = df.copy()

    for correction in corrections:
        county = correction["County"]
        original = correction["Original"]
        corrected = correction["Corrected"]

        # Find rows matching this county and original town name
        mask = (df_copy["Judet PJ"] == county) & (
            df_copy["Localitate unitate"] == original
        )

        # Update the town name to the corrected version
        df_copy.loc[mask, "Localitate unitate"] = corrected

    return df_copy


# Load the school data
print("Loading school data...")
df = pd.read_excel(
    "../data/retea-scolara-2024-2025.xlsx",
    sheet_name=0,
    skiprows=3,
    dtype={"Cod SIIIR unitate": str},
)
print(f"Loaded {len(df)} school entries.")

# Fix diacritics in the dataframe
print("Normalizing diacritics and case...")
df = fix_diacritics_case(df)

# Load the localitati GeoJSON data
localitati_geojson = load_geojson(Path("../data/ro_localitati_punct.geojson"))

# Validate towns
print("Validating towns against GeoJSON data...")
results = validate_county_towns(df, localitati_geojson)

# Apply corrections to the dataframe
print("Applying town corrections...")
corrected_df = apply_town_corrections(df, results["town_corrections"])

# remove Localitate PJ	Cod SIRUTA PJ	Mediu loc. PJ columns
corrected_df = corrected_df.drop(
    columns=["Localitate PJ", "Cod SIRUTA PJ", "Mediu loc. PJ"], errors="ignore"
)

# Save a CSV version for easier use with pandas
csv_filepath = "../data/retea-scolara-2024-2025.csv"
print(f"Saving CSV version to {csv_filepath}")
corrected_df.to_csv(csv_filepath, index=False, encoding="utf-8")

# Print results
print("\nValidation Results:")
print(f"Towns matched directly in ADM2: {results['matched_adm2']}")
print(
    f"Towns matched via localitati parent commune: {results['matched_via_localitati']}"
)
print(f"Unmatched towns: {results['unmatched']}")
print(f"Towns with corrections applied: {len(results['town_corrections'])}")

if results["unmatched_towns"]:
    print("\nUnmatched towns by county:")
    for county, towns in results["unmatched_towns"].items():
        print(f"\n{county}:")
        for town in towns[:10]:  # Just show first 10 to avoid overwhelming output
            print(f" - {town}")
        if len(towns) > 10:
            print(f" ... and {len(towns) - 10} more")

from sqlalchemy import create_engine, text
from sqlalchemy import String


# DB connection
engine = create_engine("postgresql://postgres:@localhost:5432/romania_edu")

corrected_df = corrected_df[
    [
        "Cod SIIIR unitate",
        "Denumire lunga unitate",
        "Localitate unitate",
        "Judet PJ",
        "Mediu loc. unitate",
        "Forma finantare",
        "Forma proprietate",
        "Strada",
        "Numar",
        "Cod postal",
        "Telefon",
        "Email",
    ]
].rename(
    columns={
        "Cod SIIIR unitate": "id",
        "Denumire lunga unitate": "nume",
        "Localitate unitate": "localitate",
        "Judet PJ": "judet",
        "Mediu loc. unitate": "mediu",
        "Forma finantare": "finantare",
        "Forma proprietate": "proprietate",
        "Strada": "strada",
        "Numar": "numar",
        "Cod postal": "cod_postal",
        "Telefon": "telefon",
        "Email": "email",
    }
)

mediu_map = {"Urban": "urban", "Rural": "rural"}

finantare_map = {
    "Buget": "buget",
    "Taxă": "taxa",
    "Ministerul Apărării Naționale": "alta",
    "Sponsorizare": "alta",
    "Contract Instituțional": "alta",
    "Ministerul Justiției": "alta",
    "Contract": "alta",
    "Ministerul Afacerilor Interne": "alta",
}

proprietate_map = {
    "Publică de Interes Național Și Local": "publica",
    "Privată": "privata",
}

corrected_df["mediu"] = corrected_df["mediu"].map(mediu_map)
corrected_df["finantare"] = corrected_df["finantare"].map(finantare_map)
corrected_df["proprietate"] = corrected_df["proprietate"].map(proprietate_map)
corrected_df["email"] = corrected_df["email"].str.strip().str.lower()
corrected_df["id"] = corrected_df["id"].astype(str)

corrected_df.to_sql(
    "school_info",
    engine,
    if_exists="replace",
    index=False,
)

# Step 2: Set PK
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE school_info ADD PRIMARY KEY (id);"))
