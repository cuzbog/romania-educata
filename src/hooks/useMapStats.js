import { useMemo, useContext } from 'react';
import DataContext from '../DataContext'; // adjust path if needed

export default function useMapStats(filteredSchools, perCapita, schoolAgeOnly, typeOfMap) {
    const { demographics, bacData } = useContext(DataContext);

    const schoolAgeGroups = ["0-4", "5-9", "10-14", "15-19"];

    const getSchoolAgePopulation = (demUnit) => {
        const ageGroups = Object.keys(demUnit.population.age);
        const schoolAge = ageGroups.filter(ageGroup => schoolAgeGroups.includes(ageGroup));
        return schoolAge.reduce((acc, ageGroup) => acc + demUnit.population.age[ageGroup], 0);
    }

    const inCounty = Object.keys(filteredSchools).length == 1;

    return useMemo(() => {
        if (!filteredSchools) return {};
        const counts = {};

        if (typeOfMap === "school") {
            if (inCounty) {
                const countyName = Object.keys(filteredSchools)[0];
                const schools = filteredSchools[countyName];
                // break down by city, where city = school["Localitate unitate"]
                const cityCounts = {};
                for (const school of schools) {
                    const city = school["Localitate unitate"];
                    if (!cityCounts[city]) {
                        cityCounts[city] = 0;
                    }
                    cityCounts[city]++;
                }
                if (perCapita) {
                    for (const town in cityCounts) {
                        const demUnit = demographics.cities[countyName].cities[town];
                        const townPopulation = schoolAgeOnly
                            ? getSchoolAgePopulation(demUnit)
                            : demUnit.population.total;
                        cityCounts[town] = 1000 * cityCounts[town] / townPopulation;
                    }
                }
                counts[countyName] = cityCounts;
            } else {
                for (const [county, schools] of Object.entries(filteredSchools)) {
                    const count = schools.length;
                    const populationByCounty = schoolAgeOnly ? getSchoolAgePopulation(demographics.cities[county]) : demographics.cities[county].population.total;
                    counts[county] = perCapita
                        ? 10000 * count / populationByCounty
                        : count;
                }
                console.log(counts);
            }
        } else {
            if (!inCounty) {
                bacData.forEach(entry => {
                    const county = entry.county;
                    const number = entry.bac_students;
                    if (!counts[county]) {
                        counts[county] = 0;
                    }
                    counts[county] += number;
                });
            } else {
                const countyName = Object.keys(filteredSchools)[0];
                const cityCounts = {};
                bacData.filter(entry => entry.county === countyName).forEach(entry => {
                    const city = entry.city;
                    const number = entry.bac_students;
                    cityCounts[city] = number;
                });
                counts[countyName] = cityCounts;
            }
        }

        console.log(counts);

        return counts;
    }, [filteredSchools, perCapita, schoolAgeOnly, typeOfMap]);
}
