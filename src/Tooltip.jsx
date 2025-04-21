import { useEffect, useRef, useContext } from 'react';
import './Tooltip.css';
import { useTranslation } from 'react-i18next';
import MapStateContext from './MapStateContext';
import { Statistic } from 'antd';
import Icon, { TeamOutlined } from '@ant-design/icons';
import SchoolSVG from './components/SchoolSVG';

function Tooltip({ tooltipData, position }) {
    const tooltipRef = useRef(null);

    const { i18n } = useTranslation();

    const { typeOfMap } = useContext(MapStateContext);

    const forStudents = typeOfMap === "students";
    const icon = forStudents ? <TeamOutlined /> : <Icon component={SchoolSVG} />;

    useEffect(() => {
        // Position the tooltip when data or position changes
        if (tooltipRef.current && position) {
            tooltipRef.current.style.left = `${position.x + 10}px`;
            tooltipRef.current.style.top = `${position.y + 10}px`;
        }
    }, [position]);

    // Return null if no data to display
    if (!tooltipData) return null;

    // Otherwise render the tooltip with the provided data
    return (
        <div
            ref={tooltipRef}
            className="map-tooltip"
            style={{
                display: tooltipData ? 'block' : 'none',
                left: position?.x ? `${position.x + 10}px` : 0,
                top: position?.y ? `${position.y + 10}px` : 0
            }}
        >
            {/*
            {tooltipData.title && (
                <h4 className="tooltip-title">{tooltipData.title}</h4>
            )}

            <div className="tooltip-schools">
                {t(typeOfMap)}: {tooltipData.count}
            </div>

            {tooltipData.details && (
                <div className="tooltip-details">
                    {tooltipData.details.map((detail, i) => (
                        <div key={i} className="tooltip-detail-item">
                            {detail.label}: {detail.value}
                        </div>
                    ))}
                </div>
            )}
                */}
            <Statistic
                suffix={icon}
                value={tooltipData.count}
                title={tooltipData.title}
                valueStyle={{ fontSize: '16px' }}
                formatter={value =>
                    new Intl.NumberFormat(i18n.language, {
                        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
                        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
                    }).format(value)
                }
            />
        </div>
    );
}

export default Tooltip;