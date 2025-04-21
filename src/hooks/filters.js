import { useContext, useEffect, useState } from 'react';
import DataContext from '../DataContext';

function schoolAgePopulation(population) {
    return population.age['5-9'] + population.age['10-14'] + population.age['15-19'];
}

export function useCounts(filters, mapType) {
    const { dbConn, dbReady, demographics } = useContext(DataContext);
    const [counts, setCounts] = useState({});

    useEffect(() => {
        if (!dbReady || !dbConn || !filters || !mapType) return;

        const fetch = async () => {
            console.log(mapType);
            const isStudentCount = mapType === 'students';
            const isGradeMap = mapType === 'grades';
            const query = buildQuery(filters, isStudentCount || isGradeMap, mapType);
            console.log(query);
            const result = await dbConn.query(query);
            const key = filters.county ? 'localitate' : 'judet';

            const data = Object.fromEntries(result.toArray().map(row => {
                const adminUnit = row[key];
                const count = row.mean_grade ?? row.school_count ?? row.student_count;
                let denominator = 1;
                if (filters.perCapita) {
                    denominator = (key == 'judet') ? 10000 : 1000;
                    const population = (key == 'judet') ? demographics.cities[adminUnit].population : demographics.cities[row.judet].cities[adminUnit].population;
                    denominator = (filters.schoolAgeOnly ? schoolAgePopulation(population) : population.total) / denominator;
                }
                return [adminUnit, count / denominator];
            }));

            console.log(data);

            setCounts(data);
        };

        fetch();
    }, [filters, dbConn, dbReady, mapType]);


    return counts;
}

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------
const sqlList = arr => arr.map(x => `'${x}'`).join(',');           // ['a','b'] ->  'a','b'
const has = obj => Object.values(obj || {}).some(Boolean);        // any box ticked?

// ------------------------------------------------------------------
// public entry point
// ------------------------------------------------------------------
export function buildQuery(filters, forStudents, mapType) {
    const { inBacData, inEvaluareData } = filters;
    if (inBacData) return buildBacQuery(filters, forStudents, mapType);
    if (inEvaluareData) return buildEvalQuery(filters, forStudents, mapType);
    return buildStudentStatsQuery(filters, forStudents, mapType);
}


/*==================================================================*/
/*  1. student_stats  (default)                                     */
/*==================================================================*/
function buildStudentStatsQuery(
    { county, levels, languages, strictLevelLanguage },
    forStudents, mapType
) {
    const conditions = [];
    const joins = [];

    /* filters ------------------------------------------------------- */
    if (county) conditions.push(`si.judet = '${county}'`);

    const levelKeys = Object.keys(levels).filter(k => levels[k]);
    const langKeys = Object.keys(languages).filter(k => languages[k]);

    const levelCond = levelKeys.length ? `nivel IN (${sqlList(levelKeys)})` : null;
    const langCond = langKeys.length ? `limba_de_predare IN (${sqlList(langKeys)})` : null;

    /* joins --------------------------------------------------------- */
    if (forStudents) {
        // rows already hold student counts
        const rowFilter = [levelCond, langCond].filter(Boolean).join(' AND ');
        joins.push(`
      JOIN (
        SELECT cod_siiir_unitate, numar_elevi
        FROM student_stats
        ${rowFilter ? `WHERE ${rowFilter}` : ''}
      ) fs ON fs.cod_siiir_unitate = si.id
    `);
    } else {
        // school counting
        if (strictLevelLanguage && levelKeys.length && langKeys.length) {
            levelKeys.forEach(level => conditions.push(`
        EXISTS (
          SELECT 1 FROM student_stats
          WHERE cod_siiir_unitate = si.id
            AND nivel = '${level}'
            AND limba_de_predare IN (${sqlList(langKeys)})
        )
      `));
        } else {
            if (levelCond) joins.push(`
        JOIN (
          SELECT DISTINCT cod_siiir_unitate
          FROM student_stats WHERE ${levelCond}
        ) lvl ON lvl.cod_siiir_unitate = si.id
      `);
            if (langCond) joins.push(`
        JOIN (
          SELECT DISTINCT cod_siiir_unitate
          FROM student_stats WHERE ${langCond}
        ) lng ON lng.cod_siiir_unitate = si.id
      `);
        }
    }

    return assembleSQL({ county, joins, conditions, forStudents, mapType });
}

/*==================================================================*/
/*  2. bac_2024                                                     */
/*==================================================================*/
function buildBacQuery(
    { county, bacLanguages, bacResults },
    forStudents, mapType
) {
    const conditions = [];
    const joins = [];

    /* filters ------------------------------------------------------- */
    if (county) conditions.push(`si.judet = '${county}'`);

    const picked = Object.keys(bacLanguages || {}).filter(k => bacLanguages[k]);
    const pickedMinority = picked.filter(l => l !== 'română');
    const nonRomList = sqlList(pickedMinority);

    let langCond = null;
    if (picked.length) {
        langCond = picked.includes('română')
            ? `(non_romanian_lang IS NULL${pickedMinority.length ? ` OR non_romanian_lang IN (${nonRomList})` : ''})`
            : `non_romanian_lang IN (${nonRomList})`;
    }

    const resultKeys = Object.keys(bacResults || {}).filter(k => bacResults[k]);
    const resultCond = resultKeys.length ? `result IN (${sqlList(resultKeys)})` : null;

    /* joins --------------------------------------------------------- */
    if (forStudents) {
        const whereConds = [
            langCond,
            resultCond && `result IN (${sqlList(resultKeys)})`
        ].filter(Boolean).join(' AND ');
        const whereClause = whereConds ? `WHERE ${whereConds}` : '';

        joins.push(`
          JOIN (
            SELECT *
            FROM bac_2024
            ${whereClause}
          ) b ON b.school_code = si.id
        `);


    } else {
        const whereConds = [langCond, resultCond].filter(Boolean).join(' AND ');
        const whereClause = whereConds ? `WHERE ${whereConds}` : '';

        joins.push(`
      JOIN (
        SELECT DISTINCT school_code
        FROM bac_2024
        ${whereClause}
      ) bac ON bac.school_code = si.id
    `);
    }

    return assembleSQL({ county, joins, conditions, forStudents, mapType, diffStats: true });
}

/*==================================================================*/
/*  3. evaluare_2024  (same logic as BAC but different table)       */
/*==================================================================*/
function buildEvalQuery(
    { county },
    forStudents, mapType
) {
    const conditions = [];
    const joins = [];

    if (county) conditions.push(`si.judet = '${county}'`);

    if (forStudents) {
        joins.push(`
            JOIN (
                SELECT *
                FROM en_2024
            ) e ON e.school_code = si.id
        `);
    } else {
        joins.push(`
            JOIN (
                SELECT DISTINCT school_code
                FROM en_2024
            ) e ON e.school_code = si.id
        `);
    }

    return assembleSQL({ county, joins, conditions, forStudents, mapType, diffStats: true });
}


/*==================================================================*/
/*  Shared SELECT/GROUP‑BY assembly                                 */
/*==================================================================*/
function assembleSQL({ county, joins, conditions, forStudents, mapType, diffStats = false }) {
    const groupBy = county ? 'county_and_town' : 'county';

    const selectParts = {
        county: 'si.judet',
        county_and_town: `si.judet, COALESCE(si.localitate, 'Unknown') AS localitate`
    };
    const groupParts = {
        county: 'GROUP BY si.judet',
        county_and_town: 'GROUP BY si.judet, COALESCE(si.localitate, \'Unknown\')'
    };

    const valueExpr = forStudents
        ? (diffStats
            ? (mapType === 'grades'
                ? 'AVG(mean_grade) FILTER (WHERE mean_grade IS NOT NULL)::FLOAT AS mean_grade'
                : 'COUNT(*)::INTEGER AS student_count')
            : 'SUM(fs.numar_elevi)::INTEGER AS student_count')
        : 'COUNT(DISTINCT si.id)::INTEGER AS school_count';


    return `
    SELECT ${selectParts[groupBy]}, ${valueExpr}
    FROM school_info si
    ${joins.join('\n')}
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ${groupParts[groupBy]}
  `;
}
export function buildSchoolListQuery(filters) {
    const {
        county,
        town,
        levels = {},
        languages = {},
        strictLevelLanguage,
        inBacData,
        inEvaluareData,
        bacLanguages = {},
        bacResults = {}
    } = filters;

    if (!county || !town) return null;

    const levelKeys = Object.keys(levels).filter(k => levels[k]);
    const langKeys = Object.keys(languages).filter(k => languages[k]);
    const bacLangs = Object.keys(bacLanguages).filter(k => bacLanguages[k]);
    const bacRes = Object.keys(bacResults).filter(k => bacResults[k]);

    const baseConditions = [`si.judet = '${county}'`, `si.localitate = '${town}'`];
    const joins = [];

    // Attach aggregate-level data regardless of mode
    joins.push(`
        LEFT JOIN (
            SELECT
                cod_siiir_unitate,
                SUM(numar_elevi) AS total_elevi,
                ARRAY_AGG(DISTINCT nivel) AS nivele,
                ARRAY_AGG(DISTINCT limba_de_predare) AS limbi
            FROM student_stats
            GROUP BY cod_siiir_unitate
        ) stats ON stats.cod_siiir_unitate = si.id
    `);

    if (inEvaluareData) {
        joins.push(`
            JOIN (
                SELECT DISTINCT school_code
                FROM en_2024
            ) e ON e.school_code = si.id
        `);
    } else if (inBacData) {
        const pickedMinority = bacLangs.filter(l => l !== 'română');
        const nonRomList = sqlList(pickedMinority);

        let langCond = null;
        if (bacLangs.length) {
            langCond = bacLangs.includes('română')
                ? `(non_romanian_lang IS NULL${pickedMinority.length ? ` OR non_romanian_lang IN (${nonRomList})` : ''})`
                : `non_romanian_lang IN (${nonRomList})`;
        }

        const resultCond = bacRes.length ? `result IN (${sqlList(bacRes)})` : null;
        const where = [langCond, resultCond].filter(Boolean).join(' AND ');

        joins.push(`
            JOIN (
                SELECT DISTINCT school_code
                FROM bac_2024
                ${where ? `WHERE ${where}` : ''}
            ) b ON b.school_code = si.id
        `);
    } else {
        if (strictLevelLanguage && levelKeys.length && langKeys.length) {
            levelKeys.forEach(level => baseConditions.push(`
                EXISTS (
                    SELECT 1 FROM student_stats
                    WHERE cod_siiir_unitate = si.id
                    AND nivel = '${level}'
                    AND limba_de_predare IN (${sqlList(langKeys)})
                )
            `));
        } else {
            if (levelKeys.length) {
                joins.push(`
                    JOIN (
                        SELECT DISTINCT cod_siiir_unitate
                        FROM student_stats WHERE nivel IN (${sqlList(levelKeys)})
                    ) lvl ON lvl.cod_siiir_unitate = si.id
                `);
            }
            if (langKeys.length) {
                joins.push(`
                    JOIN (
                        SELECT DISTINCT cod_siiir_unitate
                        FROM student_stats WHERE limba_de_predare IN (${sqlList(langKeys)})
                    ) lng ON lng.cod_siiir_unitate = si.id
                `);
            }
        }
    }

    return `
        SELECT
            si.*,
            stats.total_elevi,
            stats.nivele,
            stats.limbi
        FROM school_info si
        ${joins.join('\n')}
        WHERE ${baseConditions.join(' AND ')}
    `;
}

export function useSchoolList(filters) {
    const { dbConn, dbReady } = useContext(DataContext);
    const [schools, setSchools] = useState([]);

    useEffect(() => {
        if (!dbReady || !dbConn || !filters) return;

        const query = buildSchoolListQuery(filters);
        if (!query) return;

        const fetch = async () => {
            const result = await dbConn.query(query);
            const data = result.toArray().map(row => {
                const json = row.toJSON();
                json.key = json.id;
                json.limbi = json.limbi?.toArray?.() ?? [];
                json.nivele = json.nivele?.toArray?.() ?? [];
                json.total_elevi = Number(json.total_elevi);
                delete json.id;
                return json;
            });
            setSchools(data);
        };

        fetch();
    }, [filters, dbConn, dbReady]);

    return schools;
}


