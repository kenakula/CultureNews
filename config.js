/* global module */

let config = {
  'alwaysAddBlocks': [
    // 'sprite-svg',
    // 'sprite-png',
    // 'object-fit-polyfill',
  ],
  'addStyleBefore': [
    'source/scss/variables.scss',
    'source/scss/mixins.scss',
    'source/scss/slick-slider.scss',
    // 'somePackage/dist/somePackage.css', // для 'node_modules/somePackage/dist/somePackage.css',
  ],
  'addJsBefore': [
    // 'somePackage/dist/somePackage.js', // для 'node_modules/somePackage/dist/somePackage.js',
  ],
  'addJsAfter': [
    './script.js',
  ],
  'addAssets': {
    'source/fonts/playfairdisplay-black.woff2': 'fonts/',
    'source/fonts/playfairdisplay-black.woff': 'fonts/',
    'source/fonts/raleway-bold.woff2': 'fonts/',
    'source/fonts/raleway-bold.woff': 'fonts/',
    'source/fonts/raleway-medium.woff2': 'fonts/',
    'source/fonts/raleway-medium.woff': 'fonts/',
    'source/fonts/raleway-regular.woff2': 'fonts/',
    'source/fonts/raleway-regular.woff': 'fonts/',
    'source/fonts/raleway-semibold.woff2': 'fonts/',
    'source/fonts/raleway-semibold.woff': 'fonts/',
    'source/fonts/raleway-thin.woff2': 'fonts/',
    'source/fonts/raleway-thin.woff': 'fonts/',
    'source/fonts/raleway-thin-light.woff2': 'fonts/',
    'source/fonts/raleway-thin-light.woff': 'fonts/',
    'source/fonts/proximanova-regular.woff2': 'fonts/',
    'source/fonts/proximanova-regular.woff': 'fonts/',
    'source/favicon/*.{png,ico,svg,xml,webmanifest}': 'img/favicon',
    // 'node_modules/somePackage/images/*.{png,svg,jpg,jpeg}': 'img/',
  },
  'dir': {
    'src': 'source/',
    'build': 'build/',
    'blocks': 'source/blocks/'
  }
};

module.exports = config;
