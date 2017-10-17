var UglifyJS = require("uglify-es");
var fs = require('fs-extra');
var path = require('path');


var global_defs = {
  $build_es2015: true,
  $build_es5: false,
  $build_event: false
}


var code = fs.readFileSync(path.join(__dirname, '../dist/client/core.build.js'), 'utf-8');
var options = {
  mangle: {
    properties: {
      debug: true,
      reserved: ['parentNode']
    }
  }
};

var result = UglifyJS.minify(code, options);
if (result.error) throw result.error;

fs.writeFileSync(path.join(__dirname, '../dist/client/core.test.js'), result.code)
