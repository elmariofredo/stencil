import { BuildConfig, BuildContext } from '../../util/interfaces';


export function minifyCore(config: BuildConfig, ctx: BuildContext, input: string) {
  const opts: any = config.minifyJs ? PROD_MINIFY_OPTS : DEV_MINIFY_OPTS;

  const results = config.sys.minifyJs(input, opts);

  if (results.diagnostics && results.diagnostics.length) {
    ctx.diagnostics.push(...results.diagnostics);
    return input;
  }

  return results.output;
}


// Documentation of uglify options: https://github.com/mishoo/UglifyJS2
const DEV_MINIFY_OPTS: any = {
  parse: {
    bare_returns     : false,
    expression       : false,
    filename         : null,
    html5_comments   : true,
    shebang          : true,
    strict           : false,
    toplevel         : null
  },
  compress: {
    booleans         : false,
    cascade          : false,
    collapse_vars    : false,
    comparisons      : false,
    conditionals     : true,
    dead_code        : true,
    drop_console     : false,
    drop_debugger    : false,
    evaluate         : true,
    expression       : false,
    global_defs      : {
        '$build_render': false
    },
    hoist_funs       : false,
    hoist_vars       : false,
    ie8              : false,
    if_return        : false,
    inline           : false,
    join_vars        : false,
    keep_fargs       : true,
    keep_fnames      : true,
    keep_infinity    : true,
    loops            : false,
    negate_iife      : false,
    passes           : 1,
    properties       : false,
    pure_getters     : false,
    pure_funcs       : null,
    reduce_vars      : false,
    sequences        : false,
    side_effects     : false,
    switches         : false,
    top_retain       : null,
    typeofs          : false,
    unsafe           : false,
    unsafe_comps     : false,
    unsafe_Func      : false,
    unsafe_math      : false,
    unsafe_proto     : false,
    unsafe_regexp    : false,
    unused           : true,
    warnings         : false
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
    quote_style      : 0,
    semicolons       : true,
    shebang          : true,
    source_map       : null,
    webkit           : false,
    width            : 80,
    wrap_iife        : false
  }
};


const PROD_MINIFY_OPTS: any = null;
