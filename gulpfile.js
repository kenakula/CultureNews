/* global exports process console __dirname Buffer */
'use strict';

const { series, parallel, src, dest, watch, lastRun } = require('gulp');
const fs = require('fs');
const through2 = require('through2');
const webpackStream = require('webpack-stream');
const browserSync = require('browser-sync').create();

const plumber = require('gulp-plumber');
const debug = require('gulp-debug');
const del = require('del');
const cpy = require('cpy');
const replace = require('gulp-replace');
const rename = require('gulp-rename');

const pug = require('gulp-pug');
const getClassesFromHtml = require('get-classes-from-html');
const prettyHtml = require('gulp-pretty-html');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require("autoprefixer");
const csso = require('gulp-csso');
const mqpacker = require("css-mqpacker");
const atImport = require("postcss-import");
const inlineSVG = require('postcss-inline-svg');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const objectFitImages = require('postcss-object-fit-images');
const imagemin = require('gulp-imagemin');
// const path = require('path');

// глобальные настройки сборки
const nth = {};
nth.config = require('./config.js');
// nth.blocksFromHtml = Object.create(nth.config.alwaysAddBlocks);
nth.scssImportsList = [];
const dir = nth.config.dir;

// Сообщение для компилируемых файлов
let doNotEditMsg = '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n Любое изменение проекта без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-5 раз.\n\n';

// Настройки бьютификатора
let prettyOption = {
  indent_size: 2,
  indent_char: ' ',
  unformatted: ['code', 'em', 'strong', 'span', 'i', 'b', 'br', 'script'],
  content_unformatted: [],
};

// // Настройки оптимизации изображений
// let optimizingPlugins = [
//   imagemin.gifsicle({ interlaced: true }),
//   imagemin.mozjpeg({ quality: 75, progressive: true }),
//   imagemin.optipng({ optimizationLevel: 5 }),
//   imagemin.svgo({
//     plugins: [
//       { removeViewBox: true },
//       { cleanupIDs: false }
//     ]
//   })
// ];

// // оптимизация изображений
// function optimizeImg(src) {
//   return src(src)
//     .pipe(imagemin(optimizingPlugins))
//     .pipe(dest(src))
// };

// Список и настройки плагинов postCSS
let postCssPlugins = [
  autoprefixer({ grid: true }),
  mqpacker({
    sort: true
  }),
  atImport(),
  inlineSVG(),
  objectFitImages(),
];

// копирование необходимых файлов из конфига
function copyAssets(cb) {
  for (let item in nth.config.addAssets) {
    let dest = `${dir.build}${nth.config.addAssets[item]}`;
    cpy(item, dest);
  }
  cb();
}
exports.copyAssets = copyAssets;

// копирование изображений из блоков
function copyImg(cb) {
  let copiedImages = [];
  nth.blocksFromHtml.forEach(function (block) {
    let src = `${dir.blocks}${block}/img`;
    if (fileExist(src)) {
      copiedImages.push(src);
    }
  });
  if (copiedImages.length) {
    (async () => {
      await cpy(copiedImages, `${dir.build}img`);
      cb();
    })();
  }
  else {
    cb();
  }
}
exports.copyImg = copyImg;

// генерирует svg спрайт
function generateSvgSprite(cb) {
  let spriteSvgPath = `${dir.blocks}sprite-svg/svg/`;
  if (fileExist(spriteSvgPath)) {
    return src(spriteSvgPath + '*.svg')
      .pipe(svgmin(function () {
        return { plugins: [{ cleanupIDs: { minify: true } }] }
      }))
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(rename('sprite.svg'))
      .pipe(dest(`${dir.blocks}sprite-svg/img/`));
  }
  else {
    cb();
  }
}
exports.generateSvgSprite = generateSvgSprite;

// запись файла миксинов pug
function writePugMixinsFile(cb) {
  let allBlocksWithPugFiles = getDirectories('pug');
  let pugMixins = '//-' + doNotEditMsg.replace(/\n /gm, '\n  ');
  allBlocksWithPugFiles.forEach(function (blockName) {
    pugMixins += `include ${dir.blocks.replace(dir.src, '../')}${blockName}/${blockName}.pug\n`;
  });
  fs.writeFileSync(`${dir.src}pug/mixins.pug`, pugMixins);
  cb();
}
exports.writePugMixinsFile = writePugMixinsFile;

// компиляция pugfiles
function compilePug() {
  const fileList = [
    `${dir.src}pages/**/*.pug`
  ];
  return src(fileList)
    .pipe(plumber({
      errorHandler: function (err) {
        console.log(err.message);
        this.emit('end');
      }
    }))
    .pipe(debug({ title: 'Compiles ' }))
    .pipe(pug())
    .pipe(prettyHtml(prettyOption))
    .pipe(replace(/^(\s*)(<button.+?>)(.*)(<\/button>)/gm, '$1$2\n$1  $3\n$1$4'))
    .pipe(replace(/^( *)(<.+?>)(<script>)([\s\S]*)(<\/script>)/gm, '$1$2\n$1$3\n$4\n$1$5\n'))
    .pipe(replace(/^( *)(<.+?>)(<script\s+src.+>)(?:[\s\S]*)(<\/script>)/gm, '$1$2\n$1$3$4'))
    .pipe(through2.obj(getClassesToBlocksList))
    .pipe(dest(dir.build));
}
exports.compilePug = compilePug;

// генерирует файл импорта scss файлов
function writeSassImportsFile(cb) {
  const newScssImportsList = [];
  nth.config.addStyleBefore.forEach(function (src) {
    newScssImportsList.push(src);
  });
  let allBlocksWithScssFiles = getDirectories('scss');
  allBlocksWithScssFiles.forEach(function (blockWithScssFile) {
    let url = `${dir.blocks}${blockWithScssFile}/${blockWithScssFile}.scss`;
    if (nth.blocksFromHtml.indexOf(blockWithScssFile) == -1) return;
    if (newScssImportsList.indexOf(url) > -1) return;
    newScssImportsList.push(url);
  });
  let diff = getArraysDiff(newScssImportsList, nth.scssImportsList);
  if (diff.length) {
    let msg = `\n/*!*${doNotEditMsg.replace(/\n /gm, '\n * ').replace(/\n\n$/, '\n */\n\n')}`;
    let styleImports = msg;
    newScssImportsList.forEach(function (src) {
      styleImports += `@import "${src}";\n`;
    });
    styleImports += msg;
    fs.writeFileSync(`${dir.src}scss/style.scss`, styleImports);
    console.log('---------- Write new style.scss');
    nth.scssImportsList = newScssImportsList;
  }
  cb();
}
exports.writeSassImportsFile = writeSassImportsFile;

// компилирует scss файлы
function compileSass() {
  const fileList = [
    `${dir.src}scss/style.scss`,
  ];
  return src(fileList, { sourcemaps: true })
    .pipe(plumber({
      errorHandler: function (err) {
        console.log(err.message);
        this.emit('end');
      }
    }))
    .pipe(debug({ title: 'Compiles:' }))
    .pipe(sass({ includePaths: [__dirname + '/', 'node_modules'] }))
    .pipe(postcss(postCssPlugins))
    .pipe(csso({
      restructure: false,
    }))
    .pipe(dest(`${dir.build}/css`, { sourcemaps: '.' }))
    .pipe(browserSync.stream());
}
exports.compileSass = compileSass;

// записывает импорты js файлов
function writeJsRequiresFile(cb) {
  const jsRequiresList = [];
  nth.config.addJsBefore.forEach(function (src) {
    jsRequiresList.push(src);
  });
  const allBlocksWithJsFiles = getDirectories('js');
  allBlocksWithJsFiles.forEach(function (blockName) {
    jsRequiresList.push(`../blocks/${blockName}/${blockName}.js`)
  });
  allBlocksWithJsFiles.forEach(function (blockName) {
    let src = `../blocks/${blockName}/${blockName}.js`
    if (nth.blocksFromHtml.indexOf(blockName) == -1) return;
    if (jsRequiresList.indexOf(src) > -1) return;
    jsRequiresList.push(src);
  });
  nth.config.addJsAfter.forEach(function (src) {
    jsRequiresList.push(src);
  });
  let msg = `\n/*!*${doNotEditMsg.replace(/\n /gm, '\n * ').replace(/\n\n$/, '\n */\n\n')}`;
  let jsRequires = msg + '/* global require */\n\n';
  jsRequiresList.forEach(function (src) {
    jsRequires += `require('${src}');\n`;
  });
  jsRequires += msg;
  fs.writeFileSync(`${dir.src}js/entry.js`, jsRequires);
  console.log('---------- Write new entry.js');
  cb();
}
exports.writeJsRequiresFile = writeJsRequiresFile;

// собирает js файлы
function buildJs() {
  const entryList = {
    'bundle': `./${dir.src}js/entry.js`,
  };
  return src(`${dir.src}js/entry.js`)
    .pipe(plumber())
    .pipe(webpackStream({
      mode: 'production',
      entry: entryList,
      output: {
        filename: '[name].js',
      },
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader',
            query: {
              presets: ['@babel/preset-env']
            }
          }
        ]
      },
    }))
    .pipe(dest(`${dir.build}js`));
}
exports.buildJs = buildJs;

// очищает директорию build
function clearBuildDir() {
  return del([
    `${dir.build}**/*`,
    `!${dir.build}readme.md`,
  ]);
}
exports.clearBuildDir = clearBuildDir;

// перезагрузка браузера
function reload(done) {
  browserSync.reload();
  done();
}

// ------------------------------------------ запуск сервера

function serve() {
  browserSync.init({
    server: dir.build,
    port: 8080,
    startPath: 'index.html',
    open: false,
    notify: false
  });

  // Страницы: изменение, добавление
  watch([`${dir.src}pages/**/*.pug`], { events: ['change', 'add'], delay: 100 }, series(
    compilePug,
    parallel(writeSassImportsFile, writeJsRequiresFile),
    parallel(compileSass, buildJs),
    reload
  ));

  // Страницы: удаление
  watch([`${dir.src}pages/**/*.pug`], { delay: 100 })
    .on('unlink', function (path) {
      let filePathInBuildDir = path.replace(`${dir.src}pages/`, dir.build).replace('.pug', '.html');
      fs.unlink(filePathInBuildDir, (err) => {
        if (err) throw err;
        console.log(`---------- Delete:  ${filePathInBuildDir}`);
      });
    });

  // Разметка Блоков: изменение
  watch([`${dir.blocks}**/*.pug`], { events: ['change'], delay: 100 }, series(
    compilePug,
    reload
  ));

  // Разметка Блоков: добавление
  watch([`${dir.blocks}**/*.pug`], { events: ['add'], delay: 100 }, series(
    writePugMixinsFile,
    compilePug,
    reload
  ));

  // Разметка Блоков: удаление
  watch([`${dir.blocks}**/*.pug`], { events: ['unlink'], delay: 100 }, writePugMixinsFile);

  // Шаблоны pug: все события
  watch([`${dir.src}pug/**/*.pug`, `!${dir.src}pug/mixins.pug`], { delay: 100 }, series(
    compilePug,
    parallel(writeSassImportsFile, writeJsRequiresFile),
    parallel(compileSass, buildJs),
    reload,
  ));

  // Стили Блоков: изменение
  watch([`${dir.blocks}**/*.scss`], { events: ['change'], delay: 100 }, series(
    compileSass,
  ));

  // Стили Блоков: добавление
  watch([`${dir.blocks}**/*.scss`], { events: ['add'], delay: 100 }, series(
    writeSassImportsFile,
    compileSass,
  ));

  // Стилевые глобальные файлы: все события
  watch([`${dir.src}scss/**/*.scss`, `!${dir.src}scss/style.scss`], { events: ['all'], delay: 100 }, series(
    compileSass,
  ));

  // Скриптовые глобальные файлы: все события
  watch([`${dir.src}js/**/*.js`, `!${dir.src}js/entry.js`, `${dir.blocks}**/*.js`], { events: ['all'], delay: 100 }, series(
    writeJsRequiresFile,
    buildJs,
    reload
  ));

  // Картинки: все события
  watch([`${dir.blocks}**/img/*.{jpg,jpeg,png,gif,svg,webp}`], { events: ['all'], delay: 100 }, series(copyImg, reload));

  // Спрайт SVG
  watch([`${dir.blocks}sprite-svg/svg/*.svg`], { events: ['all'], delay: 100 }, series(
    generateSvgSprite,
    copyImg,
    reload,
  ));
}

exports.build = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePug, copyAssets, generateSvgSprite),
  parallel(copyImg, writeSassImportsFile, writeJsRequiresFile),
  parallel(compileSass, buildJs),
);

exports.default = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePug, copyAssets, generateSvgSprite),
  parallel(copyImg, writeSassImportsFile, writeJsRequiresFile),
  parallel(compileSass, buildJs),
  serve,
);

// вспомогательные функции --------------------------------------
/**
 * Получение списка классов из HTML и запись его в глоб. переменную nth.blocksFromHtml.
 * @param  {object}   file Обрабатываемый файл
 * @param  {string}   enc  Кодировка
 * @param  {Function} cb   Коллбэк
 */
function getClassesToBlocksList(file, enc, cb) {
  // Передана херь — выходим
  if (file.isNull()) {
    cb(null, file);
    return;
  }
  // Проверяем, не является ли обрабатываемый файл исключением
  let processThisFile = true;
  // Файл не исключён из обработки, погнали
  if (processThisFile) {
    const fileContent = file.contents.toString();
    let classesInFile = getClassesFromHtml(fileContent);
    nth.blocksFromHtml = [];
    // Обойдём найденные классы
    for (let item of classesInFile) {
      // Не Блок или этот Блок уже присутствует?
      if ((item.indexOf('__') > -1) || (item.indexOf('--') > -1) || (nth.blocksFromHtml.indexOf(item) + 1)) continue;
      // Добавляем класс в список
      nth.blocksFromHtml.push(item);
    }
    console.log('---------- Used HTML blocks: ' + nth.blocksFromHtml.join(', '));
    file.contents = new Buffer.from(fileContent);
  }
  this.push(file);
  cb();
}


/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки
 * @return {boolean}
 */
function fileExist(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(ext) {
  let source = dir.blocks;
  let res = fs.readdirSync(source)
    .filter(item => fs.lstatSync(source + item).isDirectory())
    .filter(item => fileExist(source + item + '/' + item + '.' + ext));
  return res;
}

/**
 * Получение разницы между двумя массивами.
 * @param  {array} a1 Первый массив
 * @param  {array} a2 Второй массив
 * @return {array}    Элементы, которые отличаются
 */
function getArraysDiff(a1, a2) {
  return a1.filter(i => !a2.includes(i)).concat(a2.filter(i => !a1.includes(i)))
}