import React, { act } from 'react';
import { Card, ConfigProvider, Statistic, Space, Typography, Table, Tag, Descriptions } from 'antd';
import { useContext } from 'react';
import DataContext from '../DataContext';
import MapStateContext from '../MapStateContext';
import { useSchoolList } from '../hooks/filters.js';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const SchoolInfo = ({ school }) => {

    const { t } = useTranslation();
    return (
        <Descriptions>
            <Descriptions.Item label={t("Cod SIIR")}>{school.key}</Descriptions.Item>
            <Descriptions.Item label={t("Telefon")}>
                <a href={`tel:+40${school.telefon}`}>{school.telefon}</a>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
                <a href={`mailto:${school.email}`}>{school.email}</a>
            </Descriptions.Item>
            <Descriptions.Item label={t("Adresă")}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`str. ${school.strada} nr. ${school.numar}, ${school.localitate}, ${school.judet}, Romania`)}`} target="_blank" rel="noopener noreferrer">
                    str. {school.strada} nr. {school.numar}
                </a>
            </Descriptions.Item>
        </Descriptions>)
};



const TownSchoolsView = () => {
    const { filters } = useContext(MapStateContext);

    const schools = useSchoolList(filters);

    console.log(schools);

    const { t } = useTranslation();

    // filter by town
    // filter by town
    //const filteredSchoolsByTown = filteredSchools[activeCounty].filter(school => school["Localitate unitate"] === detailedTown);

    const columns = [
        {
            title: t('Școală'),
            dataIndex: 'nume',
            key: 'nume',
        },
        {
            title: t('Limba de instruire'),
            dataIndex: 'limbi',
            key: 'limba',
            render: (langs) => langs.map((lang) => <Tag key={lang}>{t(lang)}</Tag>),
        },
        {
            title: t('education'),
            dataIndex: 'nivele',
            key: 'nivel',
            render: (levels) => levels.map((lvl) => <Tag key={lvl}>{t(lvl)}</Tag>),
        },
        {
            title: t('Număr elevi'),
            dataIndex: 'total_elevi',
            key: 'elevi',
            sorter: (a, b) => a.total_elevi - b.total_elevi,
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%', padding: "2vh" }}>
            <Title level={1} style={{ marginBottom: 0 }}>
                {t("Listă școli")}
            </Title>
            {schools ?
                <Table pagination={false} columns={columns} dataSource={schools} rowKey="nume"
                    expandable={{
                        expandedRowRender: (record) => <SchoolInfo school={record} />,
                        rowExpandable: () => true,
                    }} /> : null}
        </Space>
    )
}

export default TownSchoolsView;