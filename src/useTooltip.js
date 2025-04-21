import maplibregl from 'maplibre-gl';

export default function setupTooltip(map) {
    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    // Only handle mousemove for tooltip display
    map.on('mousemove', (e) => {
        // Use queryRenderedFeatures to get ALL features at the pointer location
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['adm1-fill']
        });

        // If no features, remove popup
        if (!features.length) {
            popup.remove();
            return;
        }

        // For Bucharest area, try to find Bucharest specifically
        // This is the key change - handle the special case for Bucharest/Ilfov
        let feature = features[0];

        // Check if we're in the Bucharest/Ilfov area and have multiple features
        if (features.length > 1) {
            // Try to find Bucharest by name or code
            const bucharestFeature = features.find(f =>
                f.properties.name === "București" ||
                f.properties.name === "Bucharest" ||
                f.properties.abbr === "B"
            );

            if (bucharestFeature) {
                feature = bucharestFeature;
            }
        }

        // Set popup content with the selected feature
        popup
            .setLngLat(e.lngLat)
            .setHTML(`
                <strong>${feature.properties.name}</strong><br/>
                Școli: ${feature.properties.num_schools}
            `)
            .addTo(map);
    });

    // Remove popup when mouse leaves map
    map.on('mouseout', () => {
        popup.remove();
    });
}