import React, { useState } from 'react';
import { Card, ConfigProvider, Statistic, Typography, Table, Tag, Splitter } from 'antd';
import { useContext } from 'react';
import DataContext from '../DataContext';
import MapStateContext from '../MapStateContext';
import { Pie, Funnel } from '@ant-design/plots';
import TownDemographicsView from './TownDemographicsView';
import TownSchoolsView from './TownSchoolsView';

const { Title } = Typography;

const DetailedTownView = () => {
    const [chartKey, setChartKey] = useState(0);

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorBgContainer: '#fff',
                },
            }}>
            <Card style={{ margin: '20px 50px', }}
                styles={{ body: { padding: 0 } }}>
                <Splitter className="splitter" style={{ height: '80vh' }} onResizeEnd={() => {
                    setChartKey((prevKey) => prevKey + 1);
                }}>
                    <Splitter.Panel defaultSize="40%" min="20%" max="70%">
                        <TownDemographicsView chartKey={chartKey} />
                    </Splitter.Panel>
                    <Splitter.Panel>
                        <TownSchoolsView />
                    </Splitter.Panel>
                </Splitter>
            </Card>
        </ConfigProvider >

    );
};

export default DetailedTownView;