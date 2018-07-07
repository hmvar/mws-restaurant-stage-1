var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

gulp.task('default', defaultTask);
gulp.task('styles', function() {
	gulp.src('sass/**/*.scss')
		.pipe(sass()).on('error', sass.logError)
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('./css'));
});
var browserSync = require('browser-sync').create();
 browserSync.init({
     server: "./"
 });
 browserSync.stream();

function defaultTask(done) {
  console.log("Hello there");
}