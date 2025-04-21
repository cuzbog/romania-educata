import React, { useState, useEffect, useRef } from 'react';
import { Divider, Statistic, Typography, Row, Col, Tag, Space, Segmented } from 'antd';
import { useContext } from 'react';
import DataContext from '../DataContext';
import MapStateContext from '../MapStateContext';
import { Pie, Column } from '@ant-design/plots';
import { useTranslation } from 'react-i18next';
import { ALL_LEVEL_KEYS, COUNTY_NAMES } from '../constants/constants';
import { useSchoolList } from '../hooks/filters.js';


const { Title } = Typography;

const TownDemographicsView = ({ chartKey }) => {
    const { demographics } = useContext(DataContext);
    const { filters, typeOfMap } = useContext(MapStateContext);

    const activeCounty = filters.county;
    const detailedTown = filters.town;
    const { t, i18n } = useTranslation();

    const townPopulation = demographics.cities[activeCounty].cities[detailedTown].population;

    // filter by town
    //const filteredSchoolsByTown = filteredSchools[activeCounty].filter(school => school["Localitate unitate"] === detailedTown);

    const sum = (keys) => keys.reduce((acc, key) => acc + townPopulation.age[key], 0);
    const groupedAgeData = {
        '0-4': sum(['0-4']),
        '5-14': sum(['5-9', '10-14']),
        '15-19': sum(['15-19']),
        '20-24': sum(['20-24']),
        '25-64': sum(['25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64']),
        '65+': sum(['65-69', '70-74', '75-79', '80-84', '85+']),
    };

    const primaryName = t("Primar") + ', ' + t("Preșcolar");
    const secondaryName = t("Liceal") + ', ' + t("Profesional");

    const groupedBySchoolAgeData = {
        [primaryName]: sum(['5-9']),
        [t('Gimanzial')]: sum(['10-14']),
        [secondaryName]: sum(['15-19']),
    }

    const funnelConfig = {
        xField: 'stage',
        yField: 'number',
        autoFit: true,
        style: {
            inset: 10,
        },
        tooltip: false,
    };

    const allowed = [
        "graduate",
        "undergraduate",
        "high_school",
        "vocational",
        "middle_school",
        "primary",
        "no_education"
    ];


    const eduData = demographics.cities[activeCounty].population.education.by_ethnicity;

    const eduDataTransformed = [];

    const sortEducation = (a, b) => {
        const [education1, value1] = a;
        const [education2, value2] = b;
        const index1 = allowed.indexOf(education1);
        const index2 = allowed.indexOf(education2);
        return index2 - index1;
    }

    for (const [ethnicity, levels] of Object.entries(eduData)) {
        // remove "total" key from levels
        delete levels["total"];
        // accumulate levels
        const levelsAcc = Object.values(levels).reduce((acc, val) => acc + val, 0);

        /*const otherAcc = Object.entries(levels).reduce((acc, [key, val]) => {
            if (!allowed.has(key)) {
                acc += val;
                delete levels[key];
            }
            return acc;
        }, 0);
        levels["other"] = otherAcc;*/

        if (levelsAcc < 10) continue;
        for (const [education, value] of Object.entries(levels).sort(sortEducation)) {
            if (!allowed.includes(education)) continue;
            eduDataTransformed.push({
                ethnicity: t(`ethnicity.${ethnicity}`),
                education: t(`education_dem.${education}`),
                value,
            });
        }
    }

    const eduConfig = {
        data: eduDataTransformed,
        xField: 'ethnicity',
        yField: 'value',
        colorField: 'education',
        normalize: true,
        stack: true,
        tooltip: false,
        axis: {
            y: {
                labelFormatter: (v) =>
                    new Intl.NumberFormat(i18n.language, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    }).format(v * 100) + '%',
            },
        },
    }

    const ageFunnelData = Object.entries(groupedAgeData).map(([stage, number]) => ({ stage, number }));
    const schoolAgeFunnelData = Object.entries(groupedBySchoolAgeData).map(([stage, number]) => ({ stage, number }));
    const schools = useSchoolList(filters);
    const totalSchools = schools.length;
    const mediu = schools[0]?.["Mediu loc. unitate"] === "Urban" ? "Urban" : "Rural";
    const totalStudents = schools.reduce((acc, school) => {
        const number_of_students = school["total_elevi"];
        acc += number_of_students;
        return acc;
    }, 0);

    const parentRef = useRef(null);
    const [parentWidth, setParentWidth] = useState(0);

    useEffect(() => {
        if (!parentRef.current) return;

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setParentWidth(entry.contentRect.width);
            }
        });

        observer.observe(parentRef.current);

        return () => observer.disconnect();
    }, []);

    const [schoolAgeOnly, setSchoolAgeOnly] = useState(false);

    return (
        <Space direction="vertical" ref={parentRef} style={{ width: '100%', padding: "2vh" }}>
            <Col>
                <Row justify={"space-between"} align={"middle"}>
                    <Title level={1} style={{ marginBottom: 0 }}>
                        {detailedTown}
                    </Title>
                    <Tag color={mediu === "Urban" ? "#030852" : "blue"} >
                        {mediu}
                    </Tag>
                </Row>

                <Title level={4} type="secondary">
                    {COUNTY_NAMES[activeCounty]}
                </Title>
            </Col>
            <Row justify={"space-between"} align={"middle"}>
                <Statistic formatter={value =>
                    new Intl.NumberFormat(i18n.language, {
                        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
                        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
                    }).format(value)
                } title={t("Population")} value={townPopulation.total} />
                <Statistic formatter={value =>
                    new Intl.NumberFormat(i18n.language, {
                        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
                        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
                    }).format(value)
                } title={t("schools")} value={totalSchools} />
                <Statistic formatter={value =>
                    new Intl.NumberFormat(i18n.language, {
                        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
                        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
                    }).format(value)
                } title={t("students")} value={totalStudents} />
            </Row>


            <Divider orientation="left">{t("Ethnic Breakdown")}</Divider>
            <Pie
                data={Object.entries(townPopulation.ethnicity)
                    .filter(([_, value]) => value > 0)
                    .map(([type, value]) => ({ type: t(`ethnicity.${type}`), value }))}
                angleField="value"
                colorField="type"
                radius={1}
                label={{
                    text: 'value',
                    position: 'outside',
                }}
                tooltip={false}
                interactions={[{ type: 'element-active' }]}
                width={parentWidth}
                height={parentWidth * 0.7}
            />
            <Divider orientation="left">{t('Grupe de vârstă')}</Divider>

            <Segmented
                block
                options={['Total', t('School age')]}
                value={schoolAgeOnly ? t('School age') : 'Total'}
                onChange={(value) => {
                    setSchoolAgeOnly(value === t('School age'));
                }}
            />

            <Column
                key={100 + chartKey}
                data={schoolAgeOnly ? schoolAgeFunnelData : ageFunnelData}
                {...funnelConfig}
                width={parentWidth}
            />

            <Divider orientation="left">{t("Distribuția județeană a nivelului de educație atins")}</Divider>

            <Column
                key={200 + chartKey}
                {...eduConfig}
                width={parentWidth}
            />

        </Space>
    )
}

export default TownDemographicsView;