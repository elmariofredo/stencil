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
  compress: {
    arrows: false,
    booleans: false,
    cascade: false,
    collapse_vars: false,
    comparisons: false,
    conditionals: true, // must set for dead_code
    dead_code: true,
    drop_console: false,
    drop_debugger: false,
    evaluate: true,
    expression: false,
    global_defs: global_defs,
    hoist_funs: false,
    hoist_vars: false,
    ie8: false,
    if_return: false,
    inline: false,
    join_vars: false,
    keep_fargs: true,
    keep_fnames: true,
    keep_infinity: true,
    loops: false,
    negate_iife: false,
    passes: 1,
    properties: true,
    pure_funcs: null,
    pure_getters: false,
    reduce_vars: false,
    sequences: false,
    side_effects: false,
    switches: false,
    typeofs: false,
    toplevel: true,
    top_retain: false,
    unsafe: false,
    unsafe_comps: false,
    unsafe_Func: false,
    unsafe_math: false,
    unsafe_proto: false,
    unsafe_regexp: false,
    unused: true,
    warnings: false
  },
  mangle: false,
  output: {
    ascii_only       : false,
    beautify         : true,
    bracketize       : true,
    comments         : 'all',
    ie8              : false,
    indent_level     : 4,
    indent_start     : 0,
    inline_script    : true,
    keep_quoted_props: true,
    max_line_len     : false,
    preamble         : null,
    preserve_line    : true,
    quote_keys       : false,
    quote_style      : 1,
    semicolons       : true,
    shebang          : true,
    source_map       : null,
    webkit           : false,
    width            : 80,
    wrap_iife        : false
  }
};

var result = UglifyJS.minify(code, options);
if (result.error) throw result.error;

fs.writeFileSync(path.join(__dirname, '../dist/client/core.test.js'), result.code)
