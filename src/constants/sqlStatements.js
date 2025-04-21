export const GET_SCHOOLS_PER_TOWN_IN_COUNTY = `
SELECT localitate, CAST(COUNT(*) AS INTEGER) AS school_count
FROM school_info
WHERE judet = ?
GROUP BY localitate
`;

export const GET_SCHOOLS_PER_COUNTY = "SELECT judet, CAST(COUNT(*) AS INTEGER) AS school_count FROM school_info GROUP BY judet";