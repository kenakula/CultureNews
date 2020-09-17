import $ from 'jquery';
import slick from 'slick-carousel';


const sliderOptions = {
  infinite: false,
  arrows: false,
  dots: true,
  mobileFirst: true,
  appendDots: '.posts-slider__bullets',
  responsive: [
    {
      breakpoint: 767,
      settings: {
        slidesToShow: 2
      }
    }
  ]
};

$('.posts-slider__list').slick(sliderOptions);
