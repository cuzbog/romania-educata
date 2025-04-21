import { createContext, useState } from 'react';
import { ALL_LANGUAGES, ALL_LEVEL_KEYS, BAC_MOTHER_LANGUAGES, MAIN_LEVELS, BAC_RESULT_TYPES } from './constants/constants';


const MapStateContext = createContext();
export default MapStateContext;

export function MapStateProvider({ children }) {

    const [filters, setFilters] = useState({
        county: null,
        town: null,
        levels: Object.fromEntries(ALL_LEVEL_KEYS.map((key) => [key, MAIN_LEVELS.includes(key)])),
        languages: Object.fromEntries(ALL_LANGUAGES.map((key) => [key, true])),
        bacLanguages: Object.fromEntries(BAC_MOTHER_LANGUAGES.map((key) => [key, true])),
        bacResults: Object.fromEntries(BAC_RESULT_TYPES.map((key) => [key, true])),
        strictLevelLanguage: false,
        perCapita: false,
        schoolAgeOnly: false,
        examDataset: false,
        inBacData: false,
        inEvaluareData: false,
    });

    function setNestedKey(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const nested = keys.reduce((acc, key) => {
            if (!acc[key]) acc[key] = {};
            return acc[key];
        }, obj);
        nested[lastKey] = value;
        return { ...obj }; // return a shallow clone
    }

    const updateFilter = (key, value) => {
        setFilters((prev) => {
            const next = setNestedKey({ ...prev }, key, value);

            // Use the top-level key to still run dependent logic
            const topKey = key.split('.')[0];

            if (topKey === "schoolAgeOnly" && value === true) {
                next.perCapita = true;
            }

            if (topKey === "inBacData" && value === true) {
                if (!prev.levels["Liceal"]) {
                    next.levels = { ...prev.levels, Liceal: true };
                }
            }

            if (topKey === "inEvaluareData" && value === true) {
                if (!prev.levels["Gimnazial"]) {
                    next.levels = { ...prev.levels, Gimnazial: true };
                }
            }

            if (topKey === "levels") {
                const newLevels = next.levels || {};
                if (!newLevels["Liceal"] && prev.inBacData) {
                    next.inBacData = false;
                }
                if (!newLevels["Gimnazial"] && prev.inEvaluareData) {
                    next.inEvaluareData = false;
                }
            }

            if (topKey === "examDataset" && value === true) {
                next.inEvaluareData = true;
                next.inBacData = true;
            }

            console.log("Filters updated", next);

            return next;
        });
    };


    const [typeOfMap, setTypeOfMap] = useState("schools");

    const value = {
        filters,
        updateFilter,
        typeOfMap,
        setTypeOfMap,
    };

    return (
        <MapStateContext.Provider value={value}>
            {children}
        </MapStateContext.Provider>
    );
}
