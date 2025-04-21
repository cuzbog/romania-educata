import { useEffect, useState } from 'react';

export default function useDataLoader() {
    const [countryGeoData, setCountryGeoData] = useState(null);
    const [demographics, setDemographics] = useState(null);

    useEffect(() => {
        async function loadCountryGeoData() {
            try {
                const [countryGeoRes, demoRes] = await Promise.all([
                    fetch('data/ROU.geojson'),
                    fetch('data/demographics/total.json'),
                ]);
                const [geo, demo] = await Promise.all([
                    countryGeoRes.json(),
                    demoRes.json(),
                ]);
                setCountryGeoData(geo);
                setDemographics(demo);
            } catch (error) {
                console.error('Error loading country geo data:', error);
            }
        }

        loadCountryGeoData();
    }, []);

    return { countryGeoData, demographics };
}

export function fetchCountyGeoJSON(countyCode) {
    return fetch(`data/adm2/${countyCode}.geojson`)
        .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch county GeoJSON: ${res.status}`);
            return res.json();
        });
}
