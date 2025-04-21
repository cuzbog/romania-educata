import React, { useContext } from 'react';
import { BookOutlined, TeamOutlined, BarChartOutlined, GlobalOutlined, ControlOutlined } from '@ant-design/icons';
import { Menu, Row, Tooltip, Slider } from 'antd';
import { useTranslation } from 'react-i18next';
import MapStateContext from '../MapStateContext';

import { Checkbox, Switch } from 'antd';
import { COMMON_LANGUAGES, OTHER_LANGUAGES, MAIN_LEVELS, OTHER_LEVELS, BAC_MOTHER_LANGUAGES, BAC_RESULT_TYPES } from '../constants/constants';

export default function SidebarMenu() {
    const { i18n, t } = useTranslation();
    const { filters, updateFilter, typeOfMap } = useContext(MapStateContext);

    const languagesChildren = [
        {
            key: 'commonLanguages',
            type: 'group',
            label: t('Common Languages'),
            children: COMMON_LANGUAGES.map((lang) => ({
                key: lang,
                label: (
                    <Checkbox
                        checked={filters.languages[lang]}
                        onChange={(e) =>
                            updateFilter(`languages.${lang}`, e.target.checked)
                        }
                    >
                        {t(lang)}
                    </Checkbox>
                ),
            })),
        },
        {
            key: 'otherLanguages',
            label: t('Other Languages'),
            type: 'group',
            children: OTHER_LANGUAGES.map((lang) => ({
                key: lang,
                label: (
                    <Checkbox
                        checked={filters.languages[lang]}
                        onChange={(e) =>
                            updateFilter(`languages.${lang}`, e.target.checked)
                        }
                    >
                        {t(lang)}
                    </Checkbox>
                ),
            })),
        },
    ];

    const bacLangaugesChildren = BAC_MOTHER_LANGUAGES.map((lang) => ({
        key: lang,
        label: (
            <Checkbox
                checked={filters.bacLanguages[lang]}
                onChange={(e) =>
                    updateFilter(`bacLanguages.${lang}`, e.target.checked)
                }
            >
                {t(lang)}
            </Checkbox>
        ),
    }))

    const educationChildren = [
        {
            key: 'mainLevels',
            type: 'group',
            label: t('Main Levels'),
            children: MAIN_LEVELS.map((level) => ({
                key: level,
                label: (
                    <Checkbox
                        checked={filters.levels[level]}
                        onChange={(e) =>
                            updateFilter(`levels.${level}`, e.target.checked)
                        }
                    >
                        {t(level)}
                    </Checkbox>
                ),
            })),
        },
        {
            key: 'otherLevels',
            label: t('Other Levels'),
            children: OTHER_LEVELS.map((level) => ({
                key: level,
                label: (
                    <Checkbox
                        checked={filters.levels[level]}
                        onChange={(e) =>
                            updateFilter(`levels.${level}`, e.target.checked)
                        }
                    >
                        {t(level)}
                    </Checkbox>
                ),
            })),
        },
    ];


    const demographicsChildren = [
        {
            key: 'perCapita',
            label: (
                <Tooltip title={t("perCapitaTooltip")}>
                    <Row align={"middle"} justify="space-between">
                        <span>Per capita</span>
                        <Switch
                            checked={filters.perCapita}
                            onChange={(checked) => updateFilter('perCapita', checked)}
                            size="small"
                        />
                    </Row>
                </Tooltip>
            ),
        },
        {
            key: 'schoolAgeOnly',
            label: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{t('schoolAge')}</span>
                    <Switch
                        checked={filters.schoolAgeOnly && filters.perCapita}
                        onChange={(checked) => updateFilter('schoolAgeOnly', checked)}
                        size="small"
                        disabled={!filters.perCapita}
                    />
                </div>
            ),
        },
    ];


    const sourcesChildren = [
        { key: 'source-general', label: "General" },
        { key: 'source-bac', label: "Bacalaureat" },
        { key: 'source-en', label: "Evaluarea Națională" },
    ];

    const sourceName = filters.inBacData ? "bac" : filters.inEvaluareData ? "en" : "general";

    const generalMenuItems = [{ key: 'education', icon: <BookOutlined />, label: t('education'), children: educationChildren }, { key: 'instruction-language', icon: <GlobalOutlined />, label: t('Limba de instruire'), children: languagesChildren }, ...(typeOfMap !== 'students' ? [{
        key: 'matchSettings',
        icon: <ControlOutlined />,
        label: t('Match Settings'),
        children: [
            {
                key: 'strictLevelLanguage',
                label: (
                    <Tooltip title={t("strictLevelLanguageTooltip")}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{t('strictLevelLanguage')}</span>
                            <Switch
                                checked={filters.strictLevelLanguage}
                                onChange={(checked) => updateFilter('strictLevelLanguage', checked)}
                                size="small"
                            />
                        </div>
                    </Tooltip>
                ),
            },
        ]
    }] : [])]

    const bacMenuItems = [{ key: 'bac-language', icon: <GlobalOutlined />, label: t('Limba maternă'), children: bacLangaugesChildren }, {
        key: 'bacMatchSettings',
        icon: <ControlOutlined />,
        label: t('Result Filters'),
        /*children: [
            {
                key: 'passOnly',
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{t('bacPassOnly')}</span>
                        <Switch
                            checked={filters.bacPassOnly}
                            onChange={(checked) => updateFilter('bacPassOnly', checked)}
                            size="small"
                        />
                    </div>
                ),
            },
            {
                key: 'meanGradeRange',
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{t('Mean Grade')}</span>
                        <Slider range defaultValue={[20, 50]} disabled={false} />
                    </div>
                ),
            },
        ]*/
        children: BAC_RESULT_TYPES.map((result) => ({
            key: result,
            label: (
                <Checkbox
                    checked={filters.bacResults[result]}
                    onChange={(e) =>
                        updateFilter(`bacResults.${result}`, e.target.checked)
                    }
                >
                    {t(result)}
                </Checkbox>
            ),
        })),
    }]

    const menuItems = [
        { key: 'sources', icon: <BarChartOutlined />, label: t('Sursă'), children: sourcesChildren },
        ...(sourceName == "general" ? generalMenuItems : sourceName == "bac" ? bacMenuItems : []),
        ...(typeOfMap !== 'grades' ? [{
            key: 'demographics',
            icon: <TeamOutlined />,
            label: t('Demografie'),
            children: demographicsChildren
        }] : [])
        ,
        {
            key: 'language',
            icon: <GlobalOutlined />,
            label: t('language'),
            children: Object.keys(i18n.options.resources).map((lng) => ({
                key: `lng-${lng}`,
                label: lng === 'ro' ? 'Română' : 'English'
            }))
        }
    ];

    return (
        <Menu
            mode="inline"
            defaultOpenKeys={['education']}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            selectable={false}
            onClick={({ key, domEvent }) => {
                // Stop click from affecting checkbox children
                if (domEvent.target.tagName === 'INPUT' || domEvent.target.tagName === 'LABEL') {
                    return;
                }

                if (key.startsWith('lng-')) {
                    const lng = key.replace('lng-', '');
                    i18n.changeLanguage(lng);
                }

                if (key.startsWith("source-")) {
                    const source = key.replace("source-", "");
                    updateFilter("inBacData", source === "bac");
                    updateFilter("inEvaluareData", source === "en");
                }
            }}
            selectedKeys={[`lng-${i18n.language}`, `source-${sourceName}`]} // highlights current language
        />
    );
}
