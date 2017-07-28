const gulp = require('gulp');
const closure = require('google-closure-compiler').gulp();

gulp.task('js-compile', () => gulp
          .src(['a.js', 'util.js'])
          .pipe(closure({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            js_output_file: 'out.min.js',
            define: 'XYZ=bar',
          }))
          .pipe(gulp.dest('./dist')));
