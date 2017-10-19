import { ComponentInstance, HostElement, PlatformApi } from '../../util/interfaces';
import { initEventEmitters } from './events';
import { initProxy } from './proxy';
import { replayQueuedEventsOnInstance } from './listeners';
import { RUNTIME_ERROR } from '../../util/constants';
import { $build_element, $build_event, $build_custom_slot, $build_did_load, $build_prop, $build_state } from '../../util/core-build';


export function initComponentInstance(plt: PlatformApi, elm: HostElement) {
  // using the component's class, let's create a new instance
  const cmpMeta = plt.getComponentMeta(elm);
  const instance: ComponentInstance = elm.$instance = new cmpMeta.componentModule();

  if ($build_element) {
    // let's automatically add a reference to the host element on the instance
    instance.__el = elm;
  }

  if ($build_prop || $build_state) {
    // so we've got an host element now, and a actual instance
    // let's wire them up together with getter/settings
    // the setters are use for change detection and knowing when to re-render
    initProxy(plt, elm, instance, cmpMeta);
  }

  if ($build_event) {
    // add each of the event emitters which wire up instance methods
    // to fire off dom events from the host element
    initEventEmitters(plt, cmpMeta.eventsMeta, instance);

    // reply any event listeners on the instance that were queued up between the time
    // the element was connected and before the instance was ready
    try {
      replayQueuedEventsOnInstance(elm);
    } catch (e) {
      plt.onError(e, RUNTIME_ERROR.QueueEventsError, elm);
    }
  }
}


export function initLoad(plt: PlatformApi, elm: HostElement, hydratedCssClass?: string): any {
  const instance = elm.$instance;

  // it's possible that we've already decided to destroy this element
  // check if this element has any actively loading child elements
  if (instance && !elm._hasDestroyed && (!elm.$activeLoading || !elm.$activeLoading.length)) {

    // cool, so at this point this element isn't already being destroyed
    // and it does not have any child elements that are still loading
    // ensure we remove any child references cuz it doesn't matter at this point
    elm.$activeLoading = null;

    // sweet, this particular element is good to go
    // all of this element's children have loaded (if any)
    elm._hasLoaded = true;

    try {
      // fire off the user's elm.componentOnReady() callbacks that were
      // put directly on the element (well before anything was ready)
      if (elm._onReadyCallbacks) {
        elm._onReadyCallbacks.forEach(cb => {
          cb(elm);
        });
        delete elm._onReadyCallbacks;
      }

      if ($build_did_load) {
        // fire off the user's componentDidLoad method (if one was provided)
        // componentDidLoad only runs ONCE, after the instance's element has been
        // assigned as the host element, and AFTER render() has been called
        // we'll also fire this method off on the element, just to
        instance.componentDidLoad && instance.componentDidLoad();
      }

    } catch (e) {
      plt.onError(e, RUNTIME_ERROR.DidLoadError, elm);
    }

    // add the css class that this element has officially hydrated
    elm.classList.add(hydratedCssClass);

    // ( •_•)
    // ( •_•)>⌐■-■
    // (⌐■_■)

    // load events fire from bottom to top
    // the deepest elements load first then bubbles up
    propagateElementLoaded(elm);
  }
}


export function propagateElementLoaded(elm: HostElement) {
  // load events fire from bottom to top
  // the deepest elements load first then bubbles up
  if (elm._ancestorHostElement) {
    // ok so this element already has a known ancestor host element
    // let's make sure we remove this element from its ancestor's
    // known list of child elements which are actively loading
    const ancestorsActivelyLoadingChildren = elm._ancestorHostElement.$activeLoading;

    if (ancestorsActivelyLoadingChildren) {
      let index = ancestorsActivelyLoadingChildren.indexOf(elm);
      if (index > -1) {
        // yup, this element is in the list of child elements to wait on
        // remove it so we can work to get the length down to 0
        ancestorsActivelyLoadingChildren.splice(index, 1);
      }

      // the ancestor's initLoad method will do the actual checks
      // to see if the ancestor is actually loaded or not
      // then let's call the ancestor's initLoad method if there's no length
      // (which actually ends up as this method again but for the ancestor)
      !ancestorsActivelyLoadingChildren.length && elm._ancestorHostElement.$initLoad();
    }

    // fuhgeddaboudit, no need to keep a reference after this element loaded
    delete elm._ancestorHostElement;
  }
}
