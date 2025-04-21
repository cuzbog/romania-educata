import Legend from './Legend';

export default function LegendPanel({ legendInfo, countyLegendInfo }) {
    return countyLegendInfo ? (
        <Legend {...countyLegendInfo} />
    ) : (
        legendInfo && <Legend {...legendInfo} subtitle="România" />
    );
}
