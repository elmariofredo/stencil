import { AppGlobal } from '../util/interfaces';
import { createPlatformClient } from './platform-client';
import { $build_es2015, $build_es5 } from '../util/core-build';


const App: AppGlobal = (<any>window)[appNamespace] = (<any>window)[appNamespace] || {};

const plt = createPlatformClient(Context, App, window, document, publicPath, hydratedCssClass);

plt.registerComponents(App.components).forEach(cmpMeta => {
  if ($build_es2015) {
    // standard custom element using es2015 class
    plt.defineComponent(cmpMeta, class extends HTMLElement {});
  }

  if ($build_es5) {
    // extending HTMLElement the raw ES5 way
    function HostElement(self: any) {
      return HTMLElement.call(this, self);
    }

    HostElement.prototype = Object.create(
      HTMLElement.prototype,
      { constructor: { value: HostElement, configurable: true } }
    );

    plt.defineComponent(cmpMeta, HostElement);
  }
});
