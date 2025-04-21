import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { useEffect, useState } from 'react';

const MANUAL_BUNDLES = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_next,
        mainWorker: eh_worker
    },
};
// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);


export function useDuckDB() {
    const [dbConn, setConn] = useState(null);
    const [dbReady, setReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
                const dbConn = await db.connect(); // Connect to db
                const res = await fetch('data/school_info.parquet');
                await db.registerFileBuffer('school_info.parquet', new Uint8Array(await res.arrayBuffer()));
                await dbConn.query("CREATE TABLE school_info AS SELECT * FROM 'school_info.parquet'");
                const res2 = await fetch('data/student_stats.parquet');
                await db.registerFileBuffer('student_stats.parquet', new Uint8Array(await res2.arrayBuffer()));
                await dbConn.query("CREATE TABLE student_stats AS SELECT * FROM 'student_stats.parquet'");
                const resbac = await fetch('data/bac_2024.parquet');
                await db.registerFileBuffer('bac_2024.parquet', new Uint8Array(await resbac.arrayBuffer()));
                await dbConn.query("CREATE TABLE bac_2024 AS SELECT * FROM 'bac_2024.parquet'");
                const resen = await fetch('data/en_2024.parquet');
                await db.registerFileBuffer('en_2024.parquet', new Uint8Array(await resen.arrayBuffer()));
                await dbConn.query("CREATE TABLE en_2024 AS SELECT * FROM 'en_2024.parquet'");
                //await createViews(dbConn);
                setConn(dbConn);
                setReady(true);
            } catch (error) {
                console.error("Error initializing DuckDB instance:", error);
            }
        };

        init();

        return () => {
            if (dbConn) {
                dbConn.close(); // Close the dbConnection when the component unmounts
            }
        };
    }, []);

    return { dbConn, dbReady };
}

async function createViews(dbConn) {
    const createStudentSummaryView = `
    CREATE VIEW school_with_student_stats AS
    SELECT si.*, ss.*
    FROM school_info si
    LEFT JOIN student_stats ss ON ss.cod_siiir_unitate = si.id;
    `;
    return await dbConn.query(createStudentSummaryView);
}
