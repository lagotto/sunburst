'use strict';

// Load plugins
var gulp = require('gulp');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var gutil = require('gulp-util');
var browserSync = require('browser-sync');
var usemin = require('gulp-usemin');
var notify = require('gulp-notify');

// error function for plumber
var onError = function (err) {
  gutil.beep();
  console.log(err);
};

// Browser definitions for autoprefixer
var AUTOPREFIXER_BROWSERS = [
  'last 3 versions',
  'ie >= 8',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

// BrowserSync proxy
gulp.task('browser-sync', function() {
   var files = [
      'dist/**/*.html',
      'dist/styles/**/*.css',
      'dist/scripts/**/*.js'
   ];

   browserSync.init(files, {
      server: {
         baseDir: './dist'
      }
   });
});


gulp.task('css', function() {
  return gulp.src('./app/styles/*.scss')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sass({ style: 'expanded', }))
    .pipe(gulp.dest('./dist/styles/'))
    .pipe(gulp.dest('./dist/styles/'))
    .pipe(notify({ message: 'Styles task complete' }));
});

gulp.task('jslint', function() {
  return gulp.src('./app/scripts/*.js')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'))
    .pipe(notify({ message: 'Lint task complete' }));
});

gulp.task('usemin', function () {
  return gulp.src('./app/index.html')
      .pipe(usemin({
        js: [uglify()]
      }))
      .pipe(gulp.dest('dist/'));
});

//Concatenate and Minify JS task
gulp.task('scripts', function() {
  return gulp.src('./app/scripts/*.js')
    // .pipe(uglify())
    .pipe(gulp.dest('./dist/scripts'))
    .pipe(notify({ message: 'Scripts task complete' }));
});

// Watch task
gulp.task('watch', ['browser-sync'], function () {
  gulp.watch('./app/styles/**/*', ['css']);
  gulp.watch('./app/scripts/**/*', ['jslint', 'scripts']);
  gulp.watch('./app/*.html', ['usemin']);
});

//tasks
gulp.task('default', ['usemin', 'css', 'jslint', 'scripts', 'watch']);
