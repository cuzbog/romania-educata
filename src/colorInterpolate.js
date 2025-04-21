import chroma from 'chroma-js';
import * as antColors from '@ant-design/colors';

// Keep your default color ramp
export const defaultColorRamp = antColors.blue;

export function interpolateColor(value, min, max, colorRamp = defaultColorRamp) {
    const scale = chroma.scale(colorRamp).domain([min, max]);
    return scale(value).hex();
}

export function getInterpolatedColorRampMatch({
    counts,
    colorRamp = defaultColorRamp,
    key = 'mnemonic',
    minOverride,
    maxOverride
}) {
    /*const inCounty = Object.keys(counts).length == 1;
    if (inCounty) {
        const county = Object.keys(counts)[0];
        const result = getInterpolatedColorRampMatch({
            counts: counts[county],
            key: "name",
            minOverride: minOverride,
            maxOverride: maxOverride
        });
        return result;
    }*/
    const keys = Object.keys(counts);
    const values = Object.values(counts);

    console.log(keys, values)

    const min = minOverride ?? Math.min(...values);
    const max = maxOverride ?? Math.max(...values);

    const scale = chroma.scale(colorRamp).domain([min, max]);

    const match = ['match', ['get', key]];

    for (const code of keys) {
        const count = counts[code];
        match.push(code, scale(count).hex());
    }

    match.push('#f0f0f0');

    return match;
}
