export default function loadCountyTowns(countyCode, countyFeature, map, schoolType = 'all') {
    // Check if the towns layer already exists and remove it
    if (map.getSource('adm2-towns')) {
        if (map.getLayer('adm2-town-points')) map.removeLayer('adm2-town-points');
        if (map.getLayer('adm2-town-borders')) map.removeLayer('adm2-town-borders');
        if (map.getLayer('adm2-town-labels')) map.removeLayer('adm2-town-labels');
        map.removeSource('adm2-towns');
    }

    // First try to fetch the specific school data for this county
    fetch(`data/adm2/${countyCode}-schools.geojson`)
        .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch towns: ${res.status}`);
            return res.json();
        })
        .then(townsData => {
            // Filter the town data based on school type if needed
            if (schoolType !== 'all') {
                townsData.features = townsData.features.map(feature => {
                    const newFeature = { ...feature };
                    const props = { ...feature.properties };

                    // Apply filtering logic based on school type
                    if (schoolType === 'secondary') {
                        // For middle and high schools
                        props.num_schools = (props.middle_schools || 0) + (props.high_schools || 0);
                    } else if (schoolType === 'highschool') {
                        // For high schools only
                        props.num_schools = props.high_schools || 0;
                    }

                    newFeature.properties = props;
                    return newFeature;
                });
            }

            // Add source for towns
            map.addSource('adm2-towns', {
                type: 'geojson',
                data: townsData,
                generateId: true
            });

            // Add town polygons
            map.addLayer({
                id: 'adm2-town-points',
                type: 'fill',
                source: 'adm2-towns',
                paint: {
                    'fill-color': '#f7fbff',
                    'fill-opacity': 0.6
                }
            });

            // Add borders
            map.addLayer({
                id: 'adm2-town-borders',
                type: 'line',
                source: 'adm2-towns',
                paint: {
                    'line-color': '#FFF',
                    'line-width': 0.8
                }
            });

            // Add town labels
            map.addLayer({
                id: 'adm2-town-labels',
                type: 'symbol',
                source: 'adm2-towns',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold'],
                    'text-size': 11,
                    'text-anchor': 'top',
                    'text-allow-overlap': true,
                    'text-ignore-placement': false
                },
                paint: {
                    'text-color': '#333',
                    'text-halo-color': '#fff',
                    'text-halo-width': 1.5
                }
            });

            // Add hover effect for towns
            map.on('mouseenter', 'adm2-town-points', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'adm2-town-points', () => {
                map.getCanvas().style.cursor = '';
            });
        })
        .catch(error => {
            console.error(`Error loading towns for ${countyCode}:`, error);
            // Optionally show a notification that town data couldn't be loaded
        });
}