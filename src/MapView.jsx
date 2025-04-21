import Map from './Map';
import DetailedTownView from './components/DetailedTownView';
import { useContext, useRef, useEffect } from 'react';
import MapStateContext from './MapStateContext';
import { Carousel, ConfigProvider } from 'antd';

export default function MapView() {

    const { filters, updateFilter } = useContext(MapStateContext);
    const carouselRef = useRef(null);
    const detailedTown = filters.town;
    useEffect(() => {
        if (detailedTown && carouselRef.current) {
            carouselRef.current.goTo(1); // Go to second slide
        }
    }, [detailedTown]);


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorBgContainer: '#000000',
                },
                components: {
                    Carousel: {
                        dotWidth: 30,
                        dotActiveWidth: 50,
                        dotHeight: 5,
                        arrowSize: 30,
                        arrowOffset: 20,
                    },
                },
            }}
        >
            <Carousel ref={carouselRef} dots={detailedTown}
                speed={800}
                easing='ease-out'
                afterChange={(current) => {
                    if (current === 0) {
                        updateFilter("town", null);
                    }
                }}
                arrows={detailedTown} style={{ height: "90vh" }} swipe={false} >
                <Map />
                {detailedTown &&
                    <DetailedTownView />}
            </Carousel>
        </ConfigProvider>
    );
}