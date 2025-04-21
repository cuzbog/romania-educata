import MapView from './MapView';
import React, { useState, useContext } from 'react';
import './App.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import Icon from '@ant-design/icons';
import 'antd/dist/reset.css';
import { Layout, Menu, theme, Checkbox, Typography, Carousel, Segmented, Spin, ConfigProvider } from 'antd';
import { ALL_LEVEL_KEYS } from './constants/constants';
import { LoadingOutlined, ProfileOutlined } from '@ant-design/icons';
import SidebarMenu from './components/SidebarMenu';
import { useTranslation } from 'react-i18next';
import DataContext from './DataContext';
import useDataLoader from './hooks/useDataLoader';
import MapStateContext, { MapStateProvider } from './MapStateContext';
import { useDuckDB } from './hooks/useDuckDB';
import SchoolSVG from './components/SchoolSVG';

const { Title } = Typography;

const { Header, Content, Sider } = Layout;

const BACIcon = () => (
  <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
  </svg>
);

const ENIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-baby-icon lucide-baby"><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /></svg>
);

const MapTypePicker = () => {
  const { t } = useTranslation();
  const { filters, typeOfMap, setTypeOfMap, updateFilter } = useContext(MapStateContext);



  return (filters.town ? null :
    <Segmented
      options={[
        { value: 'schools', icon: <Icon component={SchoolSVG} />, label: t('schools') },
        { value: 'students', icon: <Icon component={BACIcon} />, label: t('students') },
        ...(filters.inBacData || filters.inEvaluareData ? [{ value: "grades", icon: <ProfileOutlined />, label: t('grades') }] : []),
        //{ value: 'evaluare', icon: <Icon component={ENIcon} />, label: t('Evaluarea Națională') },
      ]}
      value={typeOfMap}
      onChange={(value) => {
        if (value == 'grades') {
          updateFilter('bacResults.Promovat', true);
          updateFilter('bacResults.Nepromovat', false);
          updateFilter('bacResults.Absent', false);
          updateFilter('bacResults.Eliminat', false);
          updateFilter('perCapita', false);
        }
        setTypeOfMap(value);
      }}
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
      }}
    />
  );
};

function App() {
  const { countryGeoData, demographics } = useDataLoader();
  const { dbConn, dbReady } = useDuckDB();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();


  const { t } = useTranslation();

  return (
    <DataContext.Provider value={{ countryGeoData, dbConn, dbReady, demographics }}>
      <MapStateProvider>
        <Layout style={{ height: '100vh', background: colorBgContainer, display: 'flex', flexDirection: 'column' }}>
          <Header
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Title level={1} style={{ margin: 0, color: 'white' }}>
              {t('title')}
            </Title>
          </Header>
          {dbReady ?
            <Layout style={{ flexDirection: 'row', flex: 1 }}>
              <Sider width={250} style={{ background: colorBgContainer, overflowY: 'auto' }} collapsible>
                <SidebarMenu
                />
              </Sider>

              <Content
                style={{
                  margin: 0,
                  background: colorBgContainer,
                  borderRadius: borderRadiusLG,
                  flex: 1, position: 'relative',
                }}
              >
                <MapTypePicker />
                <MapView />
              </Content>
            </Layout> :
            <ConfigProvider
              theme={{
                token: {
                  colorBgMask: 'rgba(255, 255, 255, 0.7)',
                }
              }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 100 }} />} spinning={!dbReady} fullscreen />
            </ConfigProvider>}
        </Layout>
      </MapStateProvider>
    </DataContext.Provider>
  );
}

export default App;
