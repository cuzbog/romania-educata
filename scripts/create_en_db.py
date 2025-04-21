# %%
import json
from collections import defaultdict, Counter
import numpy as np
import pandas as pd

# %%
df_2024 = pd.read_excel(
    "../data/2024.09.30_evnat_2024_date-deschise.xlsx", dtype={" COD SIIIR": str}
)

# %%
# rename columns
df_2024.rename(
    columns={
        " COD SIIIR": "school_code",
        "MEDIA": "mean_grade",
        "MEDIA V-VIII": "mean_grade_school",
        "SEX": "sex",
        "NOTA ROMANA": "ro_grade",
        "NOTA LIMBA MATERNA": "non_ro_grade",
        "NOTA MATEMATICA": "math_grade",
        "NOTA CONTESTATIE ROMANA": "ro_grade_contest",
        "NOTA CONTESTATIE LB MATERNA": "non_ro_grade_contest",
        "NOTA CONTESTATIE MATEMATICA": "math_grade_contest",
    },
    inplace=True,
)

df_2024 = df_2024[
    [
        "school_code",
        "mean_grade",
        "mean_grade_school",
        "sex",
        "ro_grade",
        "ro_grade_contest",
        "non_ro_grade",
        "non_ro_grade_contest",
        "math_grade",
        "math_grade_contest",
    ]
]


from sqlalchemy import create_engine

manual_code_fixes = {
    "1362101809": "1361101474",  # school merged
    "1361100966": "1362100966",
    "4061103107": "4062103107",
    "3561106141": "3561101543",  # school merged
    "3562105606": "3561100058",  # school absorbed
    "2862101419": "2861101627",  # school absorbed
    "3561101873": "3561106462",  # school merged
    "2561101681": "2562101681",
    "0161103364": "0162103364",
    "0162101905": "0161103269",  # school absorbed
    "1762102496": "1761104652",
    "2261105925": "2262105925",
    "2761102503": "2762102503",
    "2762103852": "2761100112",  # school absorbed
    "3261101534": "3262101534",
    "0362101124": "0361104181",
    "0461108066": "0462108066",
}


engine = create_engine("postgresql://localhost/romania_edu")
df_2024["school_code"] = df_2024["school_code"].astype(str)
df_2024["school_code"] = df_2024["school_code"].replace(manual_code_fixes)

# remove non-existing school code (building demolished)
df_2024 = df_2024[df_2024["school_code"] != "4061102635"]


from sqlalchemy import text

with engine.begin() as conn:
    # 1. Write to a temporary table
    df_2024.to_sql("en_2024_raw", conn, index=False, if_exists="replace")

    # 2. Drop the final table if it exists
    conn.execute(text("DROP TABLE IF EXISTS en_2024"))

    # 3. Create the final table with FK constraint
    conn.execute(
        text(
            """
        CREATE TABLE en_2024 AS
        SELECT * FROM en_2024_raw;
    """
        )
    )

    # 4. Add the FK constraint (school_code → school_info.id)
    conn.execute(
        text(
            """
        ALTER TABLE en_2024
        ADD CONSTRAINT fk_school
        FOREIGN KEY (school_code) REFERENCES school_info(id);
    """
        )
    )

    # (Optional) Drop raw table
    conn.execute(text("DROP TABLE en_2024_raw"))
