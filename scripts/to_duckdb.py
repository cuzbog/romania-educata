import shutil
import os
import duckdb


PG_CONN = "dbname=romania_edu host=localhost"
con = duckdb.connect()
con.execute("INSTALL postgres; LOAD postgres;")

# Query pg_catalog.pg_tables via postgres_scan
tables = con.execute(
    f"""
    SELECT tablename
    FROM postgres_scan('{PG_CONN}', 'pg_catalog', 'pg_tables')
    WHERE schemaname = 'public';
"""
).fetchall()

# Export each table to Parquet
for (table_name,) in tables:
    filename = f"{table_name}.parquet"
    print(f"Exporting {table_name} → {filename}...")

    con.execute(
        f"""
        COPY (
            SELECT * FROM postgres_scan('{PG_CONN}', 'public', '{table_name}')
        ) TO '{filename}' (FORMAT PARQUET);
    """
    )
    dest_path = os.path.join("../data", filename)
    shutil.move(filename, dest_path)
    print(f"Moved to {dest_path}")
