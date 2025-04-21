import pandas as pd

students_df = pd.read_excel(
    "../data/elevi-inmatriculati-2024-2025.xlsx", dtype={"Cod Unitate Plan": str}
)


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

students_df = students_df.rename(
    columns={
        "Cod Unitate Plan": "cod_siiir_unitate",
        "Nivel": "nivel",
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

students_df = students_df[
    ["cod_siiir_unitate", "nivel", "limba_de_predare", "numar_elevi"]
]

# %%
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://localhost/romania_edu")

with engine.begin() as conn:
    # Step 1: Save raw table
    students_df.to_sql("student_stats_raw", conn, index=False, if_exists="replace")

    # Step 2: Drop final version if exists
    conn.execute(text("DROP TABLE IF EXISTS student_stats"))

    # Step 3: Create final table from raw
    conn.execute(
        text(
            """
        CREATE TABLE student_stats AS
        SELECT * FROM student_stats_raw;
    """
        )
    )

    # Step 4: Add FK constraint
    conn.execute(
        text(
            """
        ALTER TABLE student_stats
        ADD CONSTRAINT fk_student_school
        FOREIGN KEY (cod_siiir_unitate) REFERENCES school_info(id);
    """
        )
    )

    # Step 5: Drop raw table
    conn.execute(text("DROP TABLE student_stats_raw"))
