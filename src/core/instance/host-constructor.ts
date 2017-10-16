import { attributeChangedCallback } from './attribute-changed';
import { connectedCallback } from './connected';
import { disconnectedCallback } from './disconnected';
import { initLoad } from './init';
import { HostElement, PlatformApi } from '../../util/interfaces';
import { queueUpdate } from './update';
import { render } from './render';
import { $build_observe_attr } from '../../util/core-build';


export function initHostConstructor(plt: PlatformApi, HostElementConstructor: HostElement, hydratedCssClass?: string) {
  // let's wire up our functions to the host element's prototype
  // we can also inject our platform into each one that needs that api

  HostElementConstructor.connectedCallback = function() {
    connectedCallback(plt, (this as HostElement));
  };

  if ($build_observe_attr) {
    HostElementConstructor.attributeChangedCallback = function(attribName: string, oldVal: string, newVal: string) {
      attributeChangedCallback(plt, (this as HostElement), attribName, oldVal, newVal);
    };
  }

  HostElementConstructor.disconnectedCallback = function() {
    disconnectedCallback(plt, (this as HostElement));
  };

  HostElementConstructor.componentOnReady = function(cb: (elm: HostElement) => void) {
    let promise: Promise<any>;
    if (!cb) {
      promise = new Promise(resolve => {
        cb = resolve;
      });
    }
    componentOnReady((this as HostElement), cb);
    return promise;
  };

  HostElementConstructor._queueUpdate = function() {
    queueUpdate(plt, (this as HostElement));
  };

  HostElementConstructor.$initLoad = function() {
    initLoad(plt, (this as HostElement), hydratedCssClass);
  };

  HostElementConstructor._render = function(isInitialRender: boolean) {
    render(plt, (this as HostElement), plt.getComponentMeta((this as HostElement)), isInitialRender);
  };
}


function componentOnReady(elm: HostElement, cb: (elm: HostElement) => void) {
  if (!elm._hasDestroyed) {
    if (elm._hasLoaded) {
      cb(elm);
    } else {
      (elm._onReadyCallbacks = elm._onReadyCallbacks || []).push(cb);
    }
  }
}
