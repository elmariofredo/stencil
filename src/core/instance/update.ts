import { HostElement, PlatformApi } from '../../util/interfaces';
import { initComponentInstance } from './init';
import { RUNTIME_ERROR } from '../../util/constants';
import { $build_custom_slot, $build_will_load, $build_will_update, $build_did_update, $build_render } from '../../util/core-build';


export function queueUpdate(plt: PlatformApi, elm: HostElement) {
  // only run patch if it isn't queued already
  if (!elm._isQueuedForUpdate) {
    elm._isQueuedForUpdate = true;

    // run the patch in the next tick
    plt.queue.add(() => {
      // no longer queued
      elm._isQueuedForUpdate = false;

      // vdom diff and patch the host element for differences
      update(plt, elm);
    });
  }
}


export function update(plt: PlatformApi, elm: HostElement) {
  // everything is async, so somehow we could have already disconnected
  // this node, so be sure to do nothing if we've already disconnected
  if (!elm._hasDestroyed) {
    const isInitialLoad = !elm.$instance;
    let userLifecyclePromise: Promise<void>;

    if (isInitialLoad) {
      const ancestorHostElement = elm._ancestorHostElement;
      if (ancestorHostElement && !ancestorHostElement.$rendered) {
        // this is the intial load
        // this element has an ancestor host element
        // but the ancestor host element has NOT rendered yet
        // so let's just cool our jets and wait for the ancestor to render
        (ancestorHostElement.$onRender = ancestorHostElement.$onRender || []).push(() => {
          // this will get fired off when the ancestor host element
          // finally gets around to rendering its lazy self
          update(plt, elm);
        });
        return;
      }

      // haven't created a component instance for this host element yet
      try {
        // create the instance from the user's component class
        initComponentInstance(plt, elm);

        if ($build_will_load) {
          // fire off the user's componentWillLoad method (if one was provided)
          // componentWillLoad only runs ONCE, after instance's element has been
          // assigned as the host element, but BEFORE render() has been called
          try {
            if (elm.$instance.componentWillLoad) {
              userLifecyclePromise = elm.$instance.componentWillLoad();
            }
          } catch (e) {
            plt.onError(e, RUNTIME_ERROR.WillLoadError, elm);
          }
        }

      } catch (e) {
        plt.onError(e, RUNTIME_ERROR.InitInstanceError, elm, true);
      }

    } else if ($build_will_update) {
      // already created an instance and this is an update
      // fire off the user's componentWillUpdate method (if one was provided)
      // componentWillUpdate runs BEFORE render() has been called
      // but only BEFORE an UPDATE and not before the intial render
      // get the returned promise (if one was provided)
      try {
        if (elm.$instance.componentWillUpdate) {
          userLifecyclePromise = elm.$instance.componentWillUpdate();
        }
      } catch (e) {
        plt.onError(e, RUNTIME_ERROR.WillUpdateError, elm);
      }
    }

    if (userLifecyclePromise && userLifecyclePromise.then) {
      // looks like the user return a promise!
      // let's not actually kick off the render
      // until the user has resolved their promise
      userLifecyclePromise.then(() => renderUpdate(plt, elm, isInitialLoad));

    } else {
      // user never returned a promise so there's
      // no need to wait on anything, let's do the render now
      renderUpdate(plt, elm, isInitialLoad);
    }
  }
}


export function renderUpdate(plt: PlatformApi, elm: HostElement, isInitialLoad: boolean) {
  if ($build_render) {
    // if this component has a render function, let's fire
    // it off and generate a vnode for this
    try {
      elm._render(!isInitialLoad);
      // _hasRendered was just set
      // _onRenderCallbacks were all just fired off

    } catch (e) {
      plt.onError(e, RUNTIME_ERROR.RenderError, elm, true);
    }
  }

  try {
    if (isInitialLoad) {
      // so this was the initial load i guess
      elm.$initLoad();
      // componentDidLoad just fired off

    } else if ($build_did_update) {
      // fire off the user's componentDidUpdate method (if one was provided)
      // componentDidUpdate runs AFTER render() has been called
      // but only AFTER an UPDATE and not after the intial render
      elm.$instance.componentDidUpdate && elm.$instance.componentDidUpdate();
    }

  } catch (e) {
    // derp
    plt.onError(e, RUNTIME_ERROR.DidUpdateError, elm, true);
  }
}
