
module.exports = function(grunt) {

  grunt.initConfig({
    product: 'GLMap',

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: '\n',
        banner: "(function(global) {",
        footer: "}(this));"
      },
      dist: {
        src: [grunt.file.readJSON('config.json').lib, grunt.file.readJSON('config.json').src],
        dest:  'dist/<%=product%>.debug.js'
      }
    },

    uglify: {
      options: {},
      build: {
        src: 'dist/<%=product%>.debug.js',
        dest: 'dist/<%=product%>.js'
      }
    },

    shaders: {
      dist: {
        src: 'src/shaders',
        dest: 'src/shaders.js'
      }
    },

    jshint: {
      options: {
         globals: {
           Map: true
         }
       },
      all: grunt.file.readJSON('config.json').src
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerMultiTask('shaders', 'Build shaders', function() {
    var fs = require('fs');
    var dest = this.files[0].dest;

    var baseURL = this.files[0].src;

    var config = grunt.file.readJSON('config.json').shaders;
    var src, name, SHADERS = {};

    for (var i = 0; i < config.length; i++) {
      name = config[i];

      SHADERS[name] = {};

      var src = fs.readFileSync(baseURL + '/' + name + '.vertex.glsl', 'ascii');
      SHADERS[name].vertex = src.replace(/'/g, "\'").replace(/[\r\n]+/g, '\n');

      var src = fs.readFileSync(baseURL + '/' + name + '.fragment.glsl', 'ascii');
      SHADERS[name].fragment = src.replace(/'/g, "\'").replace(/[\r\n]+/g, '\n');
    }

    fs.writeFileSync(dest, 'var SHADERS = '+ JSON.stringify(SHADERS) +';\n');
  });

  grunt.registerTask('default', 'Development build', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');

//  grunt.task.run('shaders');
    grunt.task.run('concat');
    grunt.task.run('uglify');
  });

  grunt.registerTask('release', 'Release', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('jshint');
    grunt.task.run('default');
  });
};
