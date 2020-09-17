import $ from 'jquery';
import slick from 'slick-carousel';


const sliderOptions = {
  infinite: false,
  arrows: false,
  dots: true,
  mobileFirst: true,
  appendDots: '.posts-slider__bullets',
  prevArrow: '.posts-slider__button--prev',
  nextArrow: '.posts-slider__button--next',
  responsive: [
    {
      breakpoint: 767,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 2,
      }
    },
    {
      breakpoint: 1439,
      settings: {
        slidesToShow: 4,
        dots: false,
        arrows: true,
      }
    },
  ]
};

$('.posts-slider__list').slick(sliderOptions);
