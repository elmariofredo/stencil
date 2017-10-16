import { BuildConfig, BuildContext, ComponentMeta, CoreBuild, ManifestBundle } from '../../util/interfaces';
import { ENCAPSULATION, MEMBER_TYPE, PROP_TYPE } from '../../util/constants';
import { generatePreamble, normalizePath } from '../util';
import { getAppFileName } from './generate-app-files';
import { minifyCore } from './minify-core';


export function generateCore(config: BuildConfig, ctx: BuildContext, globalJsContent: string[]) {
  const staticName = 'core.build.js';

  // figure out which sections should be included
  setcoreBuild(ctx.coreBuild, ctx.manifestBundles);

  return Promise.all([
    config.sys.getClientCoreFile({ staticName: staticName }),
    getCorePolyfills(config)

  ]).then(results => {
    const coreContent = results[0];
    const polyfillsContent = results[1];

    const coreBuilds = getCoreBuilds(ctx.coreBuild);

    coreBuilds.forEach(coreBuild => {
      generateCoreBuild(config, ctx, coreBuild, globalJsContent, coreContent, polyfillsContent);
    });
  });
}


function generateCoreBuild(config: BuildConfig, ctx: BuildContext, coreBuild: CoreBuild, globalJsContent: string[], coreContent: string, polyfillsContent: string) {

  // concat the global js and transpiled code together
  let jsContent = [
    globalJsContent.join('\n'),
    coreContent
  ].join('\n').trim();

  // hardcode which features should and should not go in the core builds
  // process the transpiled code by removing unused code and minify when configured to do so
  jsContent = minifyCore(config, ctx, coreBuild, jsContent);

  // wrap the core js code together
  jsContent = wrapCoreJs(config, jsContent);

  if (coreBuild.polyfills) {
    // this build wants polyfills so let's
    // add the polyfills to the top of the core content
    // the polyfilled code is already es5/minified ready to go
    jsContent = polyfillsContent + '\n' + jsContent;
  }

  if (ctx.appFiles[coreBuild.coreId] === jsContent) {
    return;
  }
  ctx.appFiles[coreBuild.coreId] = jsContent;

  const appFileName = getAppFileName(config);
  const coreBuildFileName = getBuildFilename(config, appFileName, coreBuild.coreId, jsContent);

  // update the app core filename within the content
  jsContent = jsContent.replace(APP_CORE_FILENAME_PLACEHOLDER, coreBuildFileName);

  if (config.generateWWW) {
    // write the www/build/ app core file
    const appCoreWWW = normalizePath(config.sys.path.join(config.buildDir, appFileName, coreBuildFileName));
    ctx.filesToWrite[appCoreWWW] = jsContent;
  }

  if (config.generateDistribution) {
    // write the dist/ app core file
    const appCoreDist = normalizePath(config.sys.path.join(config.distDir, appFileName, coreBuildFileName));
    ctx.filesToWrite[appCoreDist] = jsContent;
  }
}


function getBuildFilename(config: BuildConfig, appFileName: string, coreId: string, jsContent: string) {
  if (config.hashFileNames) {
    // prod mode renames the core file with its hashed content
    const contentHash = config.sys.generateContentHash(jsContent, config.hashedFileNameLength);
    return `${appFileName}.${contentHash}.js`;
  }

  // dev file name
  return `${appFileName}.${coreId}.js`;
}


function setcoreBuild(coreBuild: CoreBuild, manifestBundles: ManifestBundle[]) {
  // figure out which sections of the core code this build doesn't even need
  manifestBundles.forEach(manifestBundle => {
    manifestBundle.moduleFiles.forEach(moduleFile => {
      setComponentCoreBuild(coreBuild, moduleFile.cmpMeta);
    });
  });
}


export function setComponentCoreBuild(coreBuild: CoreBuild, cmpMeta: ComponentMeta) {
  const memberNames = Object.keys(cmpMeta.membersMeta);
  memberNames.forEach(memberName => {
    const memberType = cmpMeta.membersMeta[memberName].memberType;
    const propType = cmpMeta.membersMeta[memberName].propType;

    if (memberType === MEMBER_TYPE.Prop || memberType === MEMBER_TYPE.PropMutable) {
      coreBuild.$build_prop = true;

      if (propType === PROP_TYPE.String || propType === PROP_TYPE.Number || propType === PROP_TYPE.Boolean) {
        coreBuild.$build_observe_attr = true;
      }

    } else if (memberType === MEMBER_TYPE.State) {
      coreBuild.$build_state = true;

    } else if (memberType === MEMBER_TYPE.PropConnect) {
      coreBuild.$build_prop = true;
      coreBuild.$build_prop_connect = true;

    } else if (memberType === MEMBER_TYPE.PropContext) {
      coreBuild.$build_prop = true;
      coreBuild.$build_prop_context = true;

    } else if (memberType === MEMBER_TYPE.Method) {
      coreBuild.$build_method = true;

    } else if (memberType === MEMBER_TYPE.Element) {
      coreBuild.$build_element = true;
    }
  });

  if (!coreBuild.$build_event) {
    coreBuild.$build_event = !!(cmpMeta.eventsMeta && cmpMeta.eventsMeta.length);
  }

  if (!coreBuild.$build_listener) {
    coreBuild.$build_listener = !!(cmpMeta.listenersMeta && cmpMeta.listenersMeta.length);
  }

  if (!coreBuild.$build_shadow_dom) {
    coreBuild.$build_shadow_dom = (cmpMeta.encapsulation === ENCAPSULATION.ShadowDom);
  }

  if (!coreBuild.$build_scoped_css) {
    coreBuild.$build_scoped_css = (cmpMeta.encapsulation === ENCAPSULATION.ScopedCss);
  }

  if (!coreBuild.$build_styles) {
    coreBuild.$build_styles = !!cmpMeta.stylesMeta;
  }
}


export function wrapCoreJs(config: BuildConfig, jsContent: string) {
  const publicPath = getAppPublicPath(config);

  const output = [
    generatePreamble(config),
    `(function(Context,appNamespace,hydratedCssClass,publicPath){`,
    `"use strict";\n`,
    `var s=document.querySelector("script[data-core='${APP_CORE_FILENAME_PLACEHOLDER}'][data-path]");`,
    `if(s){publicPath=s.getAttribute('data-path');}\n`,
    jsContent.trim(),
    `\n})({},"${config.namespace}","${config.hydratedCssClass}","${publicPath}");`
  ].join('');

  return output;
}


function getCoreBuilds(coreBuild: CoreBuild) {
  const coreBuilds: CoreBuild[] = [];

  // no custom slot
  // without ssr parser
  // es2015
  coreBuilds.push({
    coreId: 'core',
    $build_es2015: true,
    ...coreBuild
  });

  // no custom slot
  // with ssr parser
  // es2015
  coreBuilds.push({
    coreId: 'core.ssr',
    $build_es2015: true,
    $build_ssr_parser: true,
    ...coreBuild
  });

  // es5 gets everything
  coreBuilds.push({
    coreId: 'core.pf',
    $build_es5: true,
    $build_custom_slot: true,
    $build_ssr_parser: true,
    polyfills: true,
    ...coreBuild
  });

  return coreBuilds;
}


export function getCorePolyfills(config: BuildConfig) {
  // first load up all of the polyfill content
  const readFilePromises = [
    'document-register-element.js',
    'object-assign.js',
    'promise.js',
    'fetch.js',
    'request-animation-frame.js',
    'closest.js',
    'performance-now.js'
  ].map(polyfillFile => {
    const staticName = config.sys.path.join('polyfills', polyfillFile);
    return config.sys.getClientCoreFile({ staticName: staticName });
  });

  return Promise.all(readFilePromises).then(results => {
    // concat the polyfills
    return results.join('\n').trim();
  });
}


export function getAppPublicPath(config: BuildConfig) {
  return normalizePath(
    config.sys.path.join(
      config.publicPath,
      getAppFileName(config)
    )
  ) + '/';
}


export const APP_CORE_FILENAME_PLACEHOLDER = '__APP_CORE_FILENAME__';
