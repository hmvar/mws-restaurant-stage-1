/*eslint-env node */
const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const eslint = require('gulp-eslint');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
gulp.task('lint', function() {
	return gulp.src(['scripts/*.js'])
		// eslint() attaches the lint output to the "eslint" property
		// of the file object so it can be used by other modules.
		.pipe(eslint())
		// eslint.format() outputs the lint results to the console.
		// Alternatively use eslint.formatEach() (see Docs).
		.pipe(eslint.format())
		// To have the process exit with an error code (1) on
		// lint error, return the stream and pipe to failAfterError last.
		.pipe(eslint.failAfterError());
});
gulp.task('styles', function() {
	return gulp.src('sass/**/*.scss')
		.pipe(sass({
			outputStyle: 'compressed'
		})).on('error', sass.logError)
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('dist/css'));
});
gulp.task('copy-html', function () {
	return gulp.src('./*.html')
		.pipe(gulp.dest('./dist/'));
});
gulp.task('copy-images', function () {
	return gulp.src('img/**/*')
		.pipe(imagemin({
			progressive: true,
			use: [pngquant()]
		}))
		.pipe(gulp.dest('./dist/img'));
});
gulp.task('scripts', function() {
	return gulp.src(['js/idb.js', 'js/dbhelper.js', 'js/app.js', 'js/main.js', 'js/restaurant_info.js'])
		.pipe(concat('all.js'))
		.pipe(gulp.dest('dist/js/'));
});
gulp.task('default', gulp.series(
	'lint',
	'styles',
	'copy-html',
	'copy-images',
	'scripts',
	function () {
		gulp.watch('sass/**/*.scss', gulp.series['styles']);
		gulp.watch('js/**/*.js', gulp.series['lint']);
		gulp.watch('js/**/*.js', gulp.series['scripts']);
		gulp.watch('*.html', gulp.series['copy-html']);
		gulp.watch('*.html').on('change', browserSync.reload);
		browserSync.init({
			server: './dist'
		});
	})
);
const browserSync = require('browser-sync').create();
browserSync.stream();
