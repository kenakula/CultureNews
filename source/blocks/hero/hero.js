import $ from 'jquery';
import slick from 'slick-carousel';


const sliderOptions = {
  infinite: false,
  arrows: false,
  dots: true,
  mobileFirst: true,
  dotsClass: 'hero__dots',
  prevArrow: '.hero__button--left',
  nextArrow: '.hero__button--right',
  responsive: [
    {
      breakpoint: 1024,
      settings: {
        arrows: true
      }
    }
  ]
};

$('.hero__list').slick(sliderOptions);
