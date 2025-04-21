import pandas as pd
import re
import os
import json
import unicodedata


def strip_diacritics(text):
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


output_dir = "../data/demographics/"
os.makedirs(output_dir, exist_ok=True)

county_code_mapping = {
    "ALBA": "AB",
    "ARAD": "AR",
    "ARGEȘ": "AG",
    "BACĂU": "BC",
    "BIHOR": "BH",
    "BISTRIȚA-NĂSĂUD": "BN",
    "BOTOȘANI": "BT",
    "BRĂILA": "BR",
    "BRAȘOV": "BV",
    "BUZĂU": "BZ",
    "CĂLĂRAȘI": "CL",
    "CARAȘ-SEVERIN": "CS",
    "CLUJ": "CJ",
    "CONSTANȚA": "CT",
    "COVASNA": "CV",
    "DÂMBOVIȚA": "DB",
    "DOLJ": "DJ",
    "GALAȚI": "GL",
    "GIURGIU": "GR",
    "GORJ": "GJ",
    "HARGHITA": "HR",
    "HUNEDOARA": "HD",
    "IALOMIȚA": "IL",
    "IAȘI": "IS",
    "ILFOV": "IF",
    "MARAMUREȘ": "MM",
    "MEHEDINȚI": "MH",
    "MUREȘ": "MS",
    "NEAMȚ": "NT",
    "OLT": "OT",
    "PRAHOVA": "PH",
    "SĂLAJ": "SJ",
    "SATU MARE": "SM",
    "SIBIU": "SB",
    "SUCEAVA": "SV",
    "TELEORMAN": "TR",
    "TIMIȘ": "TM",
    "TULCEA": "TL",
    "VÂLCEA": "VL",
    "VASLUI": "VS",
    "VRANCEA": "VN",
    "MUNICIPIUL BUCURESTI": "B",
}

stripped_county_code_mapping = {
    strip_diacritics(k.upper()): v for k, v in county_code_mapping.items()
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

    for prefix in ["Oraș ", "Municipiul ", "MUNICIPIUL ", "ORAS ", "ORAȘ "]:
        if text.startswith(prefix):
            text = text.replace(prefix, "", 1)

    # Replace word-initial Â/â with Î/î as per Romanian orthography
    text = re.sub(r"\bÂ", "Î", text)
    text = re.sub(r"\bâ", "î", text)

    # Remove spaces before and after hyphens
    text = re.sub(r"\s*-\s*", "-", text)

    # Fix prepositions to be lowercase when they're not at the beginning
    prepositions = [
        "De",
        "La",
        "Din",
        "Lui",
        "Pe",
        "Cu",
        "În",
        "Sub",
        "Cel",
    ]
    for prep in prepositions:
        # Replace only when not at the beginning of the text
        text = re.sub(r"(?<!\A)(?<!\s\()(?<!\-)" + prep + r"\b", prep.lower(), text)

    return text


def split(dataframe):
    groups = []
    current = []
    for _, row in dataframe.iterrows():
        if pd.isna(row["raw_locality"]):
            if current:
                groups.append(pd.DataFrame(current))
                current = []
        else:
            current.append(row)

    # Append last group if any
    if current:
        groups.append(pd.DataFrame(current))

    return groups


ethnicity_columns = {
    "total_pop": "total",
    "Români": "romani",
    "Maghiari": "maghiari",
    "Romi": "romi",
    "Ucraineni": "ucraineni",
    "Germani": "germani",
    "Turci": "turci",
    "Ruși-Lipoveni": "rusi_lipoveni",
    "Tatari": "tatari",
    "Sârbi": "sarbi",
    "Slovaci": "slovaci",
    "Bulgari": "bulgari",
    "Croați": "croati",
    "Greci": "greci",
    "Italieni": "italieni",
    "Evrei": "evrei",
    "Cehi": "cehi",
    "Polonezi": "polonezi",
    "Ruteni": "ruteni",
    "Armeni": "armeni",
    "Albanezi": "albanezi",
    "Macedoneni": "macedoneni",
    "Altă etnie": "alta_etnie",
    "Neidentificat": "neidentificat",
}


def create_ethnicity_lookup():
    df = pd.read_excel(
        "../data/Tabel-2.02.1-si-Tabel-2.02.2.xlsx", sheet_name="Tab 2.2.2", skiprows=5
    )

    df.columns = ["raw_locality"] + list(df.columns[1:25]) + ["drop_duplicate_locality"]

    col_mapping = {"raw_locality": "raw_locality"}
    col_mapping.update(
        {old: new for old, new in zip(df.columns[1:25], ethnicity_columns.values())}
    )

    df = df[list(col_mapping.keys())].rename(columns=col_mapping)
    df_romania = df.iloc[[0]].copy()
    df = df.iloc[1:].reset_index(drop=True)
    df_cleaned = df.iloc[:-3].copy().reset_index(drop=True)
    df_bucharest = df.iloc[[-2]].copy()

    groups = split(df_cleaned)

    for group in groups:
        group.iloc[:, 1:] = (
            pd.to_numeric(group.iloc[:, 1:].stack(), errors="coerce")
            .unstack()
            .fillna(0)
            .astype(int)
        )

    ethnicity_keys = [v for k, v in ethnicity_columns.items() if v != "total"]
    ethnicity_lookup = {}

    for group in groups:
        county_row = group.iloc[0]
        county_name = normalize_names(county_row["raw_locality"])
        county_code = county_code_mapping.get(county_name.upper(), None)

        county_ethnicity = {k: int(county_row[k]) for k in ethnicity_keys}
        ethnicity_lookup[county_code] = {"__county__": county_ethnicity}

        for _, row in group.iloc[1:].iterrows():
            city_name = normalize_names(row["raw_locality"])
            ethnicity_lookup[county_code][city_name] = {
                k: int(row[k]) for k in ethnicity_keys
            }

    # Add Romania-level data
    ethnicity_lookup["ROU"] = {
        "__county__": {k: int(df_romania.iloc[0][k]) for k in ethnicity_keys}
    }

    # Add Bucharest (treated as a county)
    ethnicity_lookup["B"] = {
        "__county__": {k: int(df_bucharest.iloc[0][k]) for k in ethnicity_keys}
    }

    return ethnicity_lookup


def validate_lookup_against_geojson(
    lookup, geojson_dir="../data/adm2", label="ethnicity"
):
    import json
    from collections import defaultdict

    def load_geojson(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return None

    def extract_place_names(geojson_data):
        if not geojson_data or "features" not in geojson_data:
            return set()
        return {
            f["properties"]["name"]
            for f in geojson_data["features"]
            if "name" in f.get("properties", {})
        }

    results = {
        "counties_processed": 0,
        "cities_validated": 0,
        "cities_missing": 0,
        "missing_details": [],
    }

    # some manual patches
    manual_patch = {
        ("CJ", "Rișca"): "Râșca",
    }

    for county_code, data in lookup.items():
        if county_code == "ROU" or county_code == "B":
            continue
        geojson_path = os.path.join(geojson_dir, f"{county_code}.geojson")
        geojson_data = load_geojson(geojson_path)
        if not geojson_data:
            continue

        valid_places = extract_place_names(geojson_data)

        stripped_valid_map = {strip_diacritics(name): name for name in valid_places}
        results["counties_processed"] += 1

        to_patch = []

        for city_name in list(data.keys()):
            # all good here
            if city_name == "__county__":
                continue
            results["cities_validated"] += 1
            if city_name in valid_places:
                continue

            # something's off
            if city_name not in valid_places:
                # try to find by stripping diacritics
                city_stripped = strip_diacritics(city_name)
                correct_name = stripped_valid_map.get(city_stripped)
            if correct_name:
                to_patch.append((city_name, correct_name))
                print(
                    f"[{label}] Patched: '{city_name}' → '{correct_name}' in {county_code}"
                )
            else:
                correct_name = manual_patch.get((county_code, city_name))
                if correct_name:
                    to_patch.append((city_name, correct_name))
                    print(
                        f"[{label}] Manually patched: '{city_name}' → '{correct_name}' in {county_code}"
                    )
                else:
                    results["cities_missing"] += 1
                    results["missing_details"].append(
                        {"county": county_code, "city": city_name}
                    )
                    print(
                        f"[{label}] Warning: City '{city_name}' not found in {county_code}.geojson"
                    )

        for old, new in to_patch:
            data[new] = data.pop(old)

    print(f"\n[{label.upper()} VALIDATION SUMMARY]")
    print(f"Counties processed: {results['counties_processed']}")
    print(f"Cities validated: {results['cities_validated']}")
    print(f"Cities missing: {results['cities_missing']}")
    if results["missing_details"]:
        print("\nMissing cities by county:")
        current_county = None
        for item in sorted(
            results["missing_details"], key=lambda x: (x["county"], x["city"])
        ):
            if current_county != item["county"]:
                current_county = item["county"]
                print(f"\n{current_county}:")
            print(f"  - {item['city']}")


ethnicity_lookup = create_ethnicity_lookup()
validate_lookup_against_geojson(
    ethnicity_lookup,
)


def create_age_lookup():
    age_df = pd.read_excel(
        "../data/Tabel-1.03_1.3.1-si-1.03.2.xls",
        sheet_name="TAB. 1.03.2_RPL2021",
        skiprows=7,
    )

    age_groups = [
        "0-4",
        "5-9",
        "10-14",
        "15-19",
        "20-24",
        "25-29",
        "30-34",
        "35-39",
        "40-44",
        "45-49",
        "50-54",
        "55-59",
        "60-64",
        "65-69",
        "70-74",
        "75-79",
        "80-84",
        "85+",
    ]
    # Rename the columns to match our structure
    age_df.columns = (
        ["raw_locality", "total_pop"]
        + age_groups
        + ["drop" + str(i) for i in range(age_df.shape[1] - 2 - len(age_groups))]
    )

    # Keep only the columns we want
    age_df = age_df[["raw_locality", "total_pop"] + age_groups]

    # Extract Bucharest from age_df at index -5
    bucharest_age = age_df.iloc[[-5]].copy()

    # Drop Bucharest and the preceding row (keep everything up to -7)
    age_df_cleaned = age_df.iloc[:-6].copy().reset_index(drop=True)

    groups = split(age_df_cleaned)
    # check there are no NaN values and convert to int
    for group in groups:
        group.iloc[:, 1:] = (
            pd.to_numeric(group.iloc[:, 1:].stack(), errors="coerce")
            .unstack()
            .fillna(0)
            .astype(int)
        )

    age_lookup = {}
    for group in groups:
        county_row = group.iloc[0]
        county_name = normalize_names(county_row["raw_locality"])
        county_code = county_code_mapping.get(county_name.upper(), None)

        if county_code is None:
            county_code = stripped_county_code_mapping.get(
                strip_diacritics(county_name.upper())
            )

        county_age = {k: int(county_row[k]) for k in age_groups}
        age_lookup[county_code] = {"__county__": county_age}

        for _, row in group.iloc[1:].iterrows():
            city_name = normalize_names(row["raw_locality"])
            # fix, fix, fix
            age_lookup[county_code][city_name] = {k: int(row[k]) for k in age_groups}

    # Add Bucharest
    age_lookup["B"] = {
        "__county__": {k: int(bucharest_age.iloc[0][k]) for k in age_groups}
    }

    return age_lookup


age_lookup = create_age_lookup()
validate_lookup_against_geojson(
    age_lookup,
    label="age",
)


def create_education_lookup():
    df = pd.read_excel(
        "../data/Tabel-2.12.1-si-Tabel-2.12.2.xlsx",
        sheet_name="Tab. 2.12.2",
        skiprows=7,
    )
    df = df.iloc[:-2]
    df = df.iloc[:, :-1]

    df.columns = [
        "raw_locality",
        "total",
        "graduate",
        "undergraduate",
        "postliceal",
        "total_secondary",
        "high_school",
        "vocational",
        "middle_school",
        "primary",
        "preschool",
        "no_education",
        "illiterate",
        "under_2",
    ]

    rows = []
    current_county = None
    recording_ethnicities = False

    for _, row in df.iterrows():
        name = row["raw_locality"]

        if pd.isna(name):
            recording_ethnicities = False
            continue

        name_str = str(name).strip()

        if name_str.upper() == "ETNIA":
            recording_ethnicities = True
            continue

        if not recording_ethnicities:
            current_county = name_str
            rows.append(
                {
                    "county": current_county,
                    "ethnicity": "TOTAL",
                    **row.drop("raw_locality").to_dict(),
                }
            )
        else:
            rows.append(
                {
                    "county": current_county,
                    "ethnicity": name_str,
                    **row.drop("raw_locality").to_dict(),
                }
            )

    cleaned_df = pd.DataFrame(rows)

    # Normalize columns
    numeric_cols = cleaned_df.columns.difference(["county", "ethnicity"])
    cleaned_df[numeric_cols] = (
        cleaned_df[numeric_cols]
        .apply(pd.to_numeric, errors="coerce")
        .fillna(0)
        .astype(int)
    )

    cleaned_df["graduate"] -= cleaned_df["undergraduate"]

    # Create lookup
    edu_lookup = {}
    for county, group in cleaned_df.groupby("county"):
        norm_county = normalize_names(county)
        county_code = county_code_mapping.get(
            norm_county.upper()
        ) or stripped_county_code_mapping.get(strip_diacritics(norm_county.upper()))

        # --- manual fall‑backs ---
        norm_upper = norm_county.upper()
        if norm_upper in {"ROMÂNIA", "ROMANIA"}:
            county_code = "ROU"
        elif norm_upper in {"BUCURESTI", "BUCUREȘTI"}:
            county_code = "B"

        if not county_code:
            continue  # skip truly unknown names

        edu_lookup[county_code] = {}

        for _, row in group.iterrows():
            raw_ethnicity = str(row["ethnicity"]).strip()
            mapped_ethnicity = (
                ethnicity_columns.get(
                    raw_ethnicity, raw_ethnicity.lower().replace(" ", "_")
                )
                if raw_ethnicity != "TOTAL"
                else "__county__"
            )

            edu_lookup[county_code][mapped_ethnicity] = {
                k: int(row[k]) for k in numeric_cols
            }

    return edu_lookup


def create_total_demographics(
    ethnicity_lookup,
    age_lookup,
    education_lookup,
    out="../data/demographics/total.json",
):
    combined = {"name": "ROU", "population": {}, "cities": {}}

    all_counties = sorted(
        set(ethnicity_lookup) | set(age_lookup) | set(education_lookup)
    )

    for c in all_counties:

        # -------- national row --------
        if c == "ROU":
            combined["population"] = {
                "ethnicity": ethnicity_lookup.get("ROU", {}).get("__county__", {}),
                "education": education_lookup.get("ROU", {}).get("__county__", {}),
            }
            continue

        eth_c = ethnicity_lookup.get(c, {})
        age_c = age_lookup.get(c, {})
        edu_c = education_lookup.get(c, {})  # county‑only

        # ---- county block ----
        county_pop = {
            "total": sum(eth_c.get("__county__", {}).values()),
            "ethnicity": eth_c.get("__county__", {}),
            "age": age_c.get("__county__", {}),
            "education": {
                "overall": edu_c.get("__county__", {}),
                "by_ethnicity": {k: v for k, v in edu_c.items() if k != "__county__"},
            },
        }

        # ---- cities (education not available) ----
        cities = {}
        for city in set(eth_c) - {"__county__"}:
            cities[city] = {
                "population": {
                    "total": sum(eth_c[city].values()),
                    "ethnicity": eth_c[city],
                    "age": age_c.get(city, {}),
                    # no education field here
                }
            }

        combined["cities"][c] = {"population": county_pop, "cities": cities}

    with open(out, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False)

    print(f"✅ Combined demographics written to {out}")


education_lookup = create_education_lookup()
# validate_lookup_against_geojson(education_lookup, label="education")

create_total_demographics(
    ethnicity_lookup,
    age_lookup,
    education_lookup,
)
