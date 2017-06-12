"use strict";
const 
  gulp = require('gulp'), //tasks
  nodemon = require('gulp-nodemon'), //constant reload
  mocha = require('gulp-mocha'); //tests integration with gulp

/* default environment-aware run */
gulp.task('default', function () {
  nodemon({
      script: './src/server.js',
      ext: 'js, json',
      env: {
        PORT: 8000,
        NODE_CONFIG_DIR: './src/config' //needed for config module
      },
      ignore: ['./node_modules**']
    })
    .on('restart', function () {
      console.log('Restarting');
    });
});

/* tests run */
gulp.task('test', () => {
  process.env.NODE_CONFIG_DIR = './src/config';
  process.env.NODE_ENV = 'test';
  process.env.PORT = 3000;

  gulp.src(['./test/*.js'], {
      read: false
    })
    .pipe(mocha({
      reporter: 'spec',
      timeout: 5000
    }));
});