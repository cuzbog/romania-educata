import { defaultColorRamp } from './colorInterpolate';
import './Legend.css';
import { useContext } from 'react';
import MapStateContext from './MapStateContext';
import { useTranslation } from 'react-i18next';
import { COUNTY_NAMES } from './constants/constants.js';

function Legend({
    limits,
}) {
    const { t, i18n } = useTranslation();

    const { filters, typeOfMap } = useContext(MapStateContext);
    const title = t(typeOfMap);

    let { min, max } = limits;

    if (max == min) min = 0;

    // Format number for display
    const formatNumber = (num) => {
        const rounded = Number(num).toFixed(2);
        return new Intl.NumberFormat(i18n.language).format(rounded);
    };

    const subtitle = filters.county ? COUNTY_NAMES[filters.county] : "România";


    const gradientStyle = {
        background: `linear-gradient(to top, ${defaultColorRamp.join(', ')})`,
        height: '150px',
        width: '24px',
        borderRadius: '4px'
    };

    return (
        <div className="legend">
            <div className="legend-header">
                <h3>{title}</h3>
                {subtitle && <div className="legend-subtitle">{subtitle}</div>}
            </div>

            <div className="legend-container">
                <div className="legend-gradient" style={gradientStyle}></div>
                <div className="legend-labels">
                    <div className="legend-label legend-max">{formatNumber(max)}</div>
                    <div className="legend-label legend-min">{formatNumber(min)}</div>
                </div>
            </div>
        </div>
    );
}

export default Legend;