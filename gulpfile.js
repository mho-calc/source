'use strict';

var gulp		= require('gulp'),
	less		= require('gulp-less'),
	browserSync	= require('browser-sync').create(),//2.0版本后推荐使用create
	reload		= browserSync.reload,
	clean		= require('gulp-clean'),
	useref		= require('gulp-useref'),
	uglify 		= require('gulp-uglify'),
	imagemin	= require('gulp-imagemin'),
	prefixer	= require('gulp-autoprefixer'),
	gulpif		= require('gulp-if'),
	cache		= require('gulp-cache'),
	RevAll		= require('gulp-rev-all'),
	minifyCss	= require('gulp-minify-css');

gulp.task('pub', ['build'], function () {
	browserSync.init({
		port: 8710,
		notify: false,//右上角的小提示
    	server: {
        	baseDir: './dist'
    	}
	});
});

gulp.task('dev', ['build-less'], function () {
	browserSync.init({//已去除['src/**/*.html'], 
		port: 8503,
		notify: false,//右上角的小提示
    	server: {
        	baseDir: './src'
    	}
	});
	
	gulp.watch('src/style/*.less', ['build-less']);
	gulp.watch(['src/*.html','src/script/*.js']).on('change', reload);
});

//清空dist目录
gulp.task('clean', function() {
	return gulp.src(['dist'], {read: false})
		.pipe(clean());
});

//仅编译less
gulp.task('build-less', function(){
	return gulp.src('src/style/*.less')
		.pipe(less({strictMath: 'on', compress: true}))
		.on('error', function(e){console.log(e);})
		.pipe(gulp.dest('src/style/'))
		.pipe(reload({stream: true}));//通知browserSync重载
});

gulp.task('build', ['clean', 'build-less'], function(){
	var revAll = new RevAll({   
		dontRenameFile: ['.html'],//不重命名
//		dontGlobal: [ /^\/favicon.ico$/ ,'.bat','.txt'],
		dontUpdateReference: ['.html']//不更新引用
	});  

	//图片部分，排除以_开头的文件，以备雪碧图用
	gulp.src('src/img/**/!(_)*.{png,jpg,gif,svg}')
	.pipe(cache(imagemin()))
	.pipe(gulp.dest('dist/img'));

	//字体部分
	gulp.src('src/fonts/*.*')
	.pipe(gulp.dest('dist/fonts'));

	//数据部分和图标
	gulp.src(['src/*.json','src/favicon.ico'])
	.pipe(gulp.dest('dist'));

	//AMD模块化的库
	gulp.src('src/lib/*.js')
	.pipe(uglify())  
	.pipe(gulp.dest('dist/lib'));

	gulp.src('src/index.html')
	.pipe(useref())
	.pipe(gulpif('*.js', uglify()))  
	.pipe(gulpif('*.css', prefixer({browsers: ['last 2 versions', 'Android >= 4.4', 'IOS >= 8']})))
	.pipe(gulpif('*.css', minifyCss()))
	.pipe(revAll.revision())
	.pipe(gulp.dest('dist'));
});
