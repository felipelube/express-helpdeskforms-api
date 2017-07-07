const gulp = require('gulp'); // tasks
const nodemon = require('gulp-nodemon'); // constant reload
const mocha = require('gulp-mocha'); // tests integration with gulp
const eslint = require('gulp-eslint');

/* default environment-aware run */
gulp.task('default', () => {
  nodemon({
    script: './src/server.js',
    ext: 'js, json',
    env: {
      PORT: 8000,
      NODE_CONFIG_DIR: './src/config', // needed for config module
    },
    ignore: ['./node_modules**'],
  })
    .on('restart', () => {
      console.log('Restarting');
    });
});

/* tests run */
gulp.task('test', () => {
  process.env.NODE_CONFIG_DIR = './src/config';
  process.env.NODE_ENV = 'test';
  process.env.PORT = 3000;

  gulp.src(['./test/*.js'], {
    read: false,
  })
    .pipe(mocha({
      reporter: 'spec',
      timeout: 20000,
    }));
});

gulp.task('lint', () =>
  // ESLint ignores files with "node_modules" paths.
  // So, it's best to have gulp ignore the directory as well.
  // Also, Be sure to return the stream from the task;
  // Otherwise, the task may end before the stream has finished.
  gulp.src(['**/*.js', '!node_modules/**'])
    // eslint() attaches the lint output to the "eslint" property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failAfterError last.
    .pipe(eslint.failAfterError()));
