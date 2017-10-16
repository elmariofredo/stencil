const fs = require('fs-extra');
const path = require('path');
const rollup = require('rollup');


const ROOT_DIR = path.join(__dirname, '../');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const TRANSPILED_DIR = path.join(DIST_DIR, 'transpiled-core');
const SRC_CLIENT_DIR = path.join(TRANSPILED_DIR, 'client');
const DIST_CLIENT_DIR = path.join(DIST_DIR, 'client');
const POLYFILLS_SRC_DIR = path.join(ROOT_DIR, 'scripts', 'polyfills');
const POLYFILLS_DIST_DIR = path.join(DIST_DIR, 'client', 'polyfills');

const CLIENT_CORE_ENTRY_FILE = path.join(SRC_CLIENT_DIR, 'core.js');

const DIST_CLIENT_DEV_FILE = path.join(DIST_CLIENT_DIR, 'core.build.js');

const CLIENT_LOADER_ENTRY_FILE = path.join(SRC_CLIENT_DIR, 'loader.js');
const DIST_CLIENT_LOADER_DEV_FILE = path.join(DIST_CLIENT_DIR, 'loader.dev.js');
const DIST_CLIENT_LOADER_PROD_FILE = path.join(DIST_CLIENT_DIR, 'loader.js');


fs.ensureDirSync(DIST_CLIENT_DIR);


function buildCore() {
  bundleClientCore(
    CLIENT_CORE_ENTRY_FILE,
    DIST_CLIENT_DEV_FILE
  );

  copyPolyfills(POLYFILLS_SRC_DIR, POLYFILLS_DIST_DIR);
}


function bundleClientCore(coreEntryFile, outputFile) {
  return rollup.rollup({
    input: coreEntryFile
  })
  .then(bundle => {
    bundle.generate({
      format: 'es',
      intro: '(function(window, document, Context, appNamespace, publicPath) {\n"use strict";\n',
      outro: '})(window, document, Context, appNamespace, publicPath);'

    }).then(clientCore => {
      var coreBuild = clientCore.code;

      fs.writeFile(outputFile, coreBuild, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log('built core:', outputFile);
        }
      });

    })
  })
  .catch(err => {
    console.log(err);
    console.log(err.stack);
  });
}


function copyPolyfills(polyfillsSrcDir, polyfillsDestDir) {
  fs.copy(polyfillsSrcDir, polyfillsDestDir);
}


buildCore();
