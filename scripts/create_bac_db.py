import json
from collections import defaultdict, Counter
import numpy as np
import pandas as pd

df = pd.read_excel(
    "../data/2024.09.30_bac_date-deschise_2024-ses1.xlsx",
    dtype={"Unitate (SIIIR)": str},
)
df_2024 = df[df["Promoție"] == "2023-2024"]

# %%
# Normalize language column
df_2024["Subiect eb normalized"] = (
    df_2024["Subiect eb"].str.extract(r"^(Limba [^\(]+)").squeeze().str.strip()
)


def simplify_limba(lang):
    if isinstance(lang, str) and lang.startswith("Limba "):
        return lang.replace("Limba ", "").lower()
    return lang


df_2024["Subiect eb normalized"] = df_2024["Subiect eb normalized"].apply(
    simplify_limba
)

# rename columns
df_2024.rename(
    columns={
        "Subiect eb normalized": "non_romanian_lang",
        "Profil": "profil",
        "Fileira": "filiera",
        "Unitate (SIIIR)": "school_code",
        "Limba modernă": "foreign_lang",
        "Medie": "mean_grade",
        "STATUS": "result",
        "STATUS_C": "foreign_lang_exam",
        "Sex": "sex",
        "NOTA_EA": "ro_grade",
        "NOTA_EB": "non_ro_grade",
        "NOTA_EC": "profil_grade",
        "NOTA_ED": "choice_grade",
        "NOTA_CONTESTATIE_EA": "ro_grade_contest",
        "NOTA_CONTESTATIE_EB": "non_ro_grade_contest",
        "NOTA_CONTESTATIE_EC": "profil_grade_contest",
        "NOTA_CONTESTATIE_ED": "choice_grade_contest",
    },
    inplace=True,
)


df_2024["foreign_lang"] = df_2024["foreign_lang"].apply(simplify_limba)

# extract just these columns
df_2024 = df_2024[
    [
        "school_code",
        "sex",
        "filiera",
        "profil",
        "ro_grade",
        "ro_grade_contest",
        "non_romanian_lang",
        "non_ro_grade",
        "non_ro_grade_contest",
        "profil_grade",
        "profil_grade_contest",
        "choice_grade",
        "choice_grade_contest",
        "mean_grade",
        "result",
        "foreign_lang",
        "foreign_lang_exam",
    ]
]

from sqlalchemy import create_engine

manual_code_fixes = {
    "2161100953": "2162100953",
    "2961301861": "2961201863",
    "1661305949": "1661205942",
    "4061304226": "4061204228",
    "2261306257": "2261206259",
    "2461100487": "2461100347",  # school merged
}


engine = create_engine("postgresql://localhost/romania_edu")
df_2024["school_code"] = df_2024["school_code"].astype(str)
df_2024["school_code"] = df_2024["school_code"].replace(manual_code_fixes)


from sqlalchemy import text

with engine.begin() as conn:
    # 1. Write to a temporary table
    df_2024.to_sql("bac_2024_raw", conn, index=False, if_exists="replace")

    # 2. Drop the final table if it exists
    conn.execute(text("DROP TABLE IF EXISTS bac_2024"))

    # 3. Create the final table with FK constraint
    conn.execute(
        text(
            """
        CREATE TABLE bac_2024 AS
        SELECT * FROM bac_2024_raw;
    """
        )
    )

    # 4. Add the FK constraint (school_code → school_info.id)
    conn.execute(
        text(
            """
        ALTER TABLE bac_2024
        ADD CONSTRAINT fk_school
        FOREIGN KEY (school_code) REFERENCES school_info(id);
    """
        )
    )

    # (Optional) Drop raw table
    conn.execute(text("DROP TABLE bac_2024_raw"))
