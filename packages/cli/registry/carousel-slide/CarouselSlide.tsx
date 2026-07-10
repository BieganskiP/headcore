import { Placeholder, withDatasourceCheck } from '@sitecore-content-sdk/nextjs';
import { CarouselSlideProps } from './CarouselSlide.types';

const CarouselSlide = ({ rendering }: CarouselSlideProps) => (
  <div className="headcore-carousel-slide">
    <Placeholder name="headcore-carousel-slide-content" rendering={rendering} />
  </div>
);

export default withDatasourceCheck()<CarouselSlideProps>(CarouselSlide);
