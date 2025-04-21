import { useEffect, useState, useRef, use } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useContext } from 'react';
import MapStateContext from '../MapStateContext';
import { getInterpolatedColorRampMatch } from '../colorInterpolate';
import { fetchCountyGeoJSON } from './useDataLoader';
import { useCounts } from './filters';

export default function useMapRenderer(mapRef, countryGeoJson, {
    setTooltipData,
    setTooltipPosition,
    setLegendLimits
}) {
    const mapInitializedRef = useRef(false);
    const [map, setMap] = useState(null);
    const { filters, updateFilter, typeOfMap } = useContext(MapStateContext);
    const counts = useCounts(filters, typeOfMap);

    // initialize map

    useEffect(() => {
        if (!mapRef.current || mapInitializedRef.current) return;

        const mapInstance = new maplibregl.Map({
            container: mapRef.current,
            style: {
                version: 8,
                sources: {},
                layers: [],
                name: 'blank',
                glyphs: "https://fonts.undpgeohub.org/fonts/{fontstack}/{range}.pbf"
            },
            center: [24.99, 45.85],
            zoom: 6
        });

        mapInstance.scrollZoom.disable();
        mapInstance.dragPan.disable();
        mapInstance.doubleClickZoom.disable();
        mapInstance.keyboard.disable();

        mapInstance.on('load', () => {
            mapInitializedRef.current = true;
            setMap(mapInstance);
        });

        return () => {
            mapInstance.remove();
            mapInitializedRef.current = false;
        };
    }, [mapRef]);

    // add first layer

    useEffect(() => {
        if (!map || !countryGeoJson) return;

        if (!map.getSource('counties')) {
            // add base
            addCountryLayer();
            // detailed county view
            addTownLayers();
            // add click handler
            addClickHandler();
        }
    }, [map, countryGeoJson]);

    function addCountryLayer() {
        map.addSource('counties', {
            type: 'geojson',
            data: countryGeoJson
        });

        map.addLayer({
            id: 'county-fill',
            type: 'fill',
            source: 'counties',
            paint: {
                'fill-color': '#ccc'
            }
        });

        map.addLayer({
            id: 'county-outline',
            type: 'line',
            source: 'counties',
            paint: {
                'line-color': '#FFF',
                'line-width': 1,
            }
        });

        map.addLayer({
            id: 'adm1-county-codes',
            type: 'symbol',
            source: 'counties',
            layout: {
                'text-field': ['get', 'mnemonic'],
                'text-font': ['Open Sans Bold'],
                'text-size': 12,
                'text-anchor': 'center',
            },
            paint: {
                'text-color': '#FFF',
            }
        });
    }

    function addTownLayers() {
        map.addSource('adm2-towns', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }, // start empty
            generateId: true,
        });
        map.addLayer({
            id: 'adm2-town-points',
            type: 'fill',
            source: 'adm2-towns',
            paint: {
                'fill-color': '#ccc',
            }
        });
        map.addLayer({
            id: 'adm2-town-borders',
            type: 'line',
            source: 'adm2-towns',
            paint: {
                'line-color': '#FFF',
                'line-width': 0.8
            }
        });
        map.addLayer({
            id: 'adm2-town-labels',
            type: 'symbol',
            source: 'adm2-towns',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': 11,
                'text-anchor': 'center',
                'text-allow-overlap': true,
            },
            paint: {
                'text-color': '#333',
                'text-halo-color': '#fff',
                'text-halo-width': 1
            }
        });
    }

    // update map colors based on counts
    useEffect(() => {
        if (!map || !counts) return;

        const colored = Object.keys(counts).length > 0;

        if (filters.county == null) {
            // county-level map coloring
            if (map.getLayer('county-fill')) {
                map.setPaintProperty(
                    'county-fill',
                    'fill-color',
                    colored ? getInterpolatedColorRampMatch({ counts }) : '#ccc'
                );
            }
        } else {
            // town-level map coloring
            if (map.getLayer('adm2-town-points')) {
                map.setPaintProperty(
                    'adm2-town-points',
                    'fill-color',
                    colored ? getInterpolatedColorRampMatch({ counts, key: 'name' }) : '#ccc'
                );

            }
        }
    }, [map, counts, filters.county]);

    useEffect(() => {
        if (!map || !countryGeoJson) return;

        if (filters.county) {
            // fetch and set the town data
            fetchCountyGeoJSON(filters.county).then((countyGeoJSON) => {
                map.getSource('adm2-towns').setData(countyGeoJSON);
                ['adm2-town-points', 'adm2-town-borders', 'adm2-town-labels'].forEach(id => {
                    if (map.getLayer(id)) {
                        map.setLayoutProperty(id, 'visibility', 'visible');
                    }
                });
            });
        }
    }, [filters.county]);


    // add tooltip handler for counties and towns
    useEffect(() => {
        if (!map) return;

        const handler = (e) => {
            const feature = (!filters.county) ? getCountyFromPointer(e) : e.features[0].properties;
            const key = feature.mnemonic ?? feature.name;
            const title = feature.name;

            setTooltipData({ title, count: counts[key] });
            setTooltipPosition({ x: e.point.x, y: e.point.y });
        };

        const layers = ['county-fill', 'adm2-town-points'];
        for (const layerId of layers) {
            map.on('mousemove', layerId, handler);
            map.on('mouseleave', layerId, () => setTooltipData(null));
        }

        // cleanup to prevent multiple listeners
        return () => {
            for (const layerId of layers) {
                map.off('mousemove', layerId, handler);
                map.off('mouseleave', layerId, () => setTooltipData(null));
            }
        };
    }, [map, counts]);


    // update legend limits based on counts
    useEffect(() => {
        if (!counts) return;

        if (Object.keys(counts).length === 0) {
            setLegendLimits({ min: 0, max: 0 });
            return;
        }
        const values = Object.values(counts);
        const min = Math.min(...values);
        const max = Math.max(...values);

        setLegendLimits({ min, max });
    }, [counts]);


    // add click handler for counties and towns
    function addClickHandler() {
        map.on('click', 'county-fill', (e) => {
            // Only fire if no county is already selected
            if (!filters.county) {
                const county = getCountyFromPointer(e);
                if (!county) return;
                updateFilter('county', county.mnemonic);
            }
        });

        map.on('click', 'adm2-town-points', (e) => {
            const town = e.features?.[0]?.properties;
            if (!town?.name || town.countyMn == "B") return;
            updateFilter('town', town.name);
        });
    }

    // zoom in and out

    useEffect(() => {
        if (!map || !countryGeoJson) return;

        const activeCounty = filters.county;

        if (activeCounty) {
            const feature = countryGeoJson.features.find(
                (f) => f.properties.mnemonic === activeCounty
            );

            if (!feature) return;

            const bounds = turf.bbox(feature.geometry);
            map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
                padding: 60,
                duration: 1200,
                essential: true,
            });

            map.setFilter('county-fill', ['==', ['get', 'mnemonic'], activeCounty]);
            map.setFilter('county-outline', ['==', ['get', 'mnemonic'], activeCounty]);
            map.setFilter('adm1-county-codes', ['==', ['get', 'mnemonic'], activeCounty]);
        } else {
            map.setFilter('county-fill', null);
            map.setFilter('county-outline', null);
            map.setFilter('adm1-county-codes', null);

            map.flyTo({
                center: [24.99, 45.85],
                zoom: 6,
                duration: 1000,
                essential: true,
            });

            ['adm2-town-points', 'adm2-town-borders', 'adm2-town-labels'].forEach(id => {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, 'visibility', 'none');
                }
            });
        }
    }, [filters.county]);

    function getCountyFromPointer(e) {
        const feature = e.features[0];
        if (!feature || feature.properties.mnemonic != 'IF') return feature.properties;
        const point = turf.point([e.lngLat.lng, e.lngLat.lat]);

        // Find Bucharest feature from GeoJSON
        const bucharestFeature = countryGeoJson.features.find(f => f.properties.mnemonic === 'B');

        if (bucharestFeature && turf.booleanPointInPolygon(point, bucharestFeature.geometry)) {
            return bucharestFeature.properties;
        }
        return feature.properties;
    }
}