import { useRef, useState, useContext } from 'react';
import useMapRenderer from './hooks/useMapRenderer';
import Legend from './Legend';
import Tooltip from './Tooltip';
import DataContext from './DataContext';
import MapStateContext from './MapStateContext';
import { FloatButton, Carousel, ConfigProvider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import DetailedTownView from './components/DetailedTownView';

export default function Map() {
    const [tooltipData, setTooltipData] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [legendLimits, setLegendLimits] = useState({ min: 0, max: 0 });

    const mapRef = useRef(null);
    const { countryGeoData } = useContext(DataContext);

    const { filters, updateFilter } = useContext(MapStateContext);


    useMapRenderer(mapRef, countryGeoData, {
        setTooltipData,
        setTooltipPosition,
        setLegendLimits
    });

    return (<div className="map-wrapper">

        <div ref={mapRef} className="map-container" />

        <Tooltip
            tooltipData={tooltipData}
            position={tooltipPosition}
        />

        <Legend
            limits={legendLimits} />

        {filters.county != null && filters.town == null && <FloatButton
            type="primary"
            style={{
                top: "5vh", // ← move to top
                bottom: 'auto', // ← remove default bottom alignment
                zIndex: 1000,
                position: "absolute",
            }} onClick={() => { updateFilter("county", null) }} icon={<CloseOutlined />} />}


    </div>);
}