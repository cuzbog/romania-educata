import { useState, useEffect } from 'react';

export default function useDemographicData() {
    const [demographicData, setDemographicData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // First fetch the national data
        fetch('data/demographics/ROU.json')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch national demographic data');
                return res.json();
            })
            .then(nationalData => {
                const demographics = { ROU: nationalData };

                // Get all county codes (could be stored elsewhere)
                const countyCodes = [
                    'AB', 'AR', 'AG', 'BC', 'BH', 'BN', 'BT', 'BV', 'BR', 'B',
                    'BZ', 'CS', 'CL', 'CJ', 'CT', 'CV', 'DB', 'DJ', 'GL', 'GR',
                    'GJ', 'HR', 'HD', 'IL', 'IS', 'IF', 'MM', 'MH', 'MS', 'NT',
                    'OT', 'PH', 'SM', 'SJ', 'SB', 'SV', 'TR', 'TM', 'TL', 'VS',
                    'VL', 'VN'
                ];

                // Fetch all county demographics in parallel
                return Promise.all(
                    countyCodes.map(code =>
                        fetch(`data/demographics/${code}.json`)
                            .then(res => {
                                if (!res.ok) throw new Error(`Failed to fetch demographic data for ${code}`);
                                return res.json();
                            })
                            .then(countyData => ({ code, data: countyData }))
                            .catch(err => {
                                console.warn(`Could not load demographics for ${code}:`, err);
                                return { code, data: null };
                            })
                    )
                ).then(countyResults => {
                    countyResults.forEach(result => {
                        if (result.data) {
                            demographics[result.code] = result.data;
                        }
                    });

                    setDemographicData(demographics);
                    setLoading(false);
                });
            })
            .catch(err => {
                console.error('Error loading demographic data:', err);
                setError('Failed to load demographic data');
                setLoading(false);
            });
    }, []);

    return { demographicData, loading, error };
}