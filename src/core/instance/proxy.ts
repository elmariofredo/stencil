import { ComponentInstance, ComponentMeta, DomApi, HostElement,
  MembersMeta, PlatformApi, PropChangeMeta } from '../../util/interfaces';
import { MEMBER_TYPE, PROP_CHANGE } from '../../util/constants';
import { noop } from '../../util/helpers';
import { queueUpdate } from './update';


export function proxyHostElementPrototype(plt: PlatformApi, membersMeta: MembersMeta, hostPrototype: HostElement) {
  // create getters/setters on the host element prototype to represent the public API
  // the setters allows us to know when data has changed so we can re-render

  Object.keys(membersMeta).forEach(memberName => {
    // add getters/setters
    const memberType = membersMeta[memberName].memberType;

    if (memberType === MEMBER_TYPE.Prop || memberType === MEMBER_TYPE.PropMutable) {
      // @Prop() or @Prop({ mutable: true })
      defineProperty(
        hostPrototype,
        memberName,
        false,
        function getHostElementProp() {
          // host element getter (cannot be arrow fn)
          // yup, ugly, srynotsry
          // but its creating _values if it doesn't already exist
          return (((this as any) as HostElement)._values = ((this as any) as HostElement)._values || {})[memberName];
        },
        function setHostElementProp(newValue: any) {
          // host element setter (cannot be arrow fn)
          setProp(plt, this, memberName, newValue);
        }
      );

    } else if (memberType === MEMBER_TYPE.Method) {
      // @Method()
      // add a placeholder noop value on the host element's prototype
      // incase this method gets called before setup
      defineProperty(hostPrototype, memberName, noop);
    }
  });
}


export function proxyComponentInstance(plt: PlatformApi, cmpMeta: ComponentMeta, elm: HostElement, instance: ComponentInstance) {
  // at this point we've got a specific node of a host element, and created a component class instance
  // and we've already created getters/setters on both the host element and component class prototypes
  // let's upgrade any data that might have been set on the host element already
  // and let's have the getters/setters kick in and do their jobs

  // create the _values object if it doesn't already exist
  // this will hold all of the internal getter/setter values
  elm._values = elm._values || {};

  cmpMeta.membersMeta && Object.keys(cmpMeta.membersMeta).forEach(memberName => {
    defineMembers(plt, cmpMeta, elm, instance, memberName);
  });
}


export function defineMembers(plt: PlatformApi, cmpMeta: ComponentMeta, elm: HostElement, instance: ComponentInstance, memberName: string) {
  const membersMeta = cmpMeta.membersMeta;
  const memberMeta = membersMeta[memberName];
  const memberType = memberMeta.memberType;

  function getComponentProp() {
    // component instance prop/state getter
    // get the property value directly from our internal values
    const elm: HostElement = (this as ComponentInstance).__el;
    return elm._values[memberName];
  }

  function setComponentProp(newValue: any) {
    // component instance prop/state setter (cannot be arrow fn)
    const elm: HostElement = (this as ComponentInstance).__el;

    if (memberType !== MEMBER_TYPE.Prop) {
      setProp(plt, elm, memberName, newValue);

    } else {
      console.warn(`@Prop() "${memberName}" on "${elm.tagName}" cannot be modified.`);
    }
  }

  if (memberType === MEMBER_TYPE.Prop || memberType === MEMBER_TYPE.State || memberType === MEMBER_TYPE.PropMutable) {
    // https://developers.google.com/web/fundamentals/web-components/best-practices
    // A developer might attempt to set a property on your element
    // before its definition has been loaded. This is especially true
    // if the developer is using a framework which handles loading components,
    // inserting them into to the page, and binding their properties to a
    // model. A custom element should handle this scenario by checking if
    // any properties have already been set on its instance.
    // note: initial values from attribute would have already been set via attributeChangedCallback

    if (instance.hasOwnProperty(memberName)) {
      // @Prop() or @Prop({mutable:true}) or @State()
      // read any "own" property instance values already set
      // to our internal value as the source of getter data
      // we're about to define a property and it'll overwrite this "own" property
      elm._values[memberName] = (instance as any)[memberName];
    }

    if (memberType !== MEMBER_TYPE.State && elm.hasOwnProperty(memberName)) {
      // @Prop or @Prop({mutable:true})
      // property values on the host element should
      // override any default values on the component
      // instance which is why this check is second
      // we've already created getters/setters on the
      // host elements's prototype so we're good
      // so delete the "own" property
      elm._values[memberName] = (elm as any)[memberName];
      delete (elm as any)[memberName];
    }

    // add getter/setter to the component instance
    defineProperty(
      instance,
      memberName,
      false,
      getComponentProp,
      setComponentProp
    );

    // add watchers to props if they exist
    proxyPropChangeMethods(cmpMeta.propsWillChangeMeta, PROP_WILL_CHG, elm, instance, memberName);
    proxyPropChangeMethods(cmpMeta.propsDidChangeMeta, PROP_DID_CHG, elm, instance, memberName);

  } else if (memberType === MEMBER_TYPE.Element) {
    // @Element()
    // add a getter to the element reference using
    // the member name the component meta provided
    defineProperty(instance, memberName, elm);

  } else if (memberType === MEMBER_TYPE.Method) {
    // @Method()
    // add a property "value" on the host element
    // which we'll bind to the instance's method
    defineProperty(elm, memberName, instance[memberName].bind(instance));

  } else if (memberType === MEMBER_TYPE.PropContext) {
    // @Prop({ context: 'config' })
    var contextObj = plt.getContextItem(memberMeta.ctrlId);
    if (contextObj) {
      defineProperty(instance, memberName, (contextObj.getContext && contextObj.getContext(elm)) || contextObj);
    }

  } else if (memberType === MEMBER_TYPE.PropConnect) {
    // @Prop({ connect: 'ion-loading-ctrl' })
    defineProperty(instance, memberName, plt.propConnect(memberMeta.ctrlId));
  }
}


export function proxyPropChangeMethods(propChangeMeta: PropChangeMeta[], prefix: string, elm: HostElement, instance: ComponentInstance, memberName: string) {
  // there are prop WILL change methods for this component
  const propChangeMthd = propChangeMeta && propChangeMeta.find(m => m[PROP_CHANGE.PropName] === memberName);

  if (propChangeMthd) {
    // cool, we should watch for changes to this property
    // let's bind their watcher function and add it to our list
    // of watchers, so any time this property changes we should
    // also fire off their method
    elm._values[prefix + memberName] = (instance as any)[propChangeMthd[PROP_CHANGE.MethodName]].bind(instance);
  }
}


function setProp(plt: PlatformApi, elm: HostElement, memberName: string, newVal: any) {
  // get the internal values object, which should always come from the host element instance
  // create the _values object if it doesn't already exist
  const internalValues = (elm._values = elm._values || {});

  // check our new property value against our internal value
  const oldVal = internalValues[memberName];

  if (newVal !== oldVal) {
    // gadzooks! the property's value has changed!!

    if (internalValues[PROP_WILL_CHG + memberName]) {
      // this instance is watching for when this property WILL change
      internalValues[PROP_WILL_CHG + memberName](newVal, oldVal);
    }

    // set our new value!
    // https://youtu.be/dFtLONl4cNc?t=22
    internalValues[memberName] = newVal;

    if (internalValues[PROP_DID_CHG + memberName]) {
      // this instance is watching for when this property DID change
      internalValues[PROP_DID_CHG + memberName](newVal, oldVal);
    }

    if (elm.$instance) {
      // looks like this value actually changed, so we've got work to do!
      // but only if we've already created an instance, otherwise just chill out
      // queue that we need to do an update, but don't worry about queuing
      // up millions cuz this function ensures it only runs once
      queueUpdate(plt, elm);
    }
  }
}


function defineProperty(obj: any, propertyKey: string, value: any, getter?: any, setter?: any) {
  // minification shortcut
  const descriptor: PropertyDescriptor = {
    configurable: true
  };
  if (value) {
    descriptor.value = value;

  } else {
    if (getter) {
      descriptor.get = getter;
    }
    if (setter) {
      descriptor.set = setter;
    }
  }
  Object.defineProperty(obj, propertyKey, descriptor);
}


export function proxyController(domApi: DomApi, controllerComponents: { [tag: string]: HostElement }, ctrlTag: string) {
  return {
    'create': proxyProp(domApi, controllerComponents, ctrlTag, 'create'),
    'componentOnReady': proxyProp(domApi, controllerComponents, ctrlTag, 'componentOnReady')
  };
}


export function loadComponent(domApi: DomApi, controllerComponents: { [tag: string]: HostElement }, ctrlTag: string): Promise<any> {
  return new Promise(resolve => {
    let ctrlElm = controllerComponents[ctrlTag];
    if (!ctrlElm) {
      ctrlElm = domApi.$body.querySelector(ctrlTag) as HostElement;
    }
    if (!ctrlElm) {
      ctrlElm = controllerComponents[ctrlTag] = domApi.$createElement(ctrlTag) as any;
      domApi.$appendChild(domApi.$body, ctrlElm);
    }
    ctrlElm.componentOnReady(resolve);
  });
}


function proxyProp(domApi: DomApi, controllerComponents: { [tag: string]: HostElement }, ctrlTag: string, proxyMethodName: string) {
  return function () {
    const args = arguments;
    return loadComponent(domApi, controllerComponents, ctrlTag)
      .then(ctrlElm => ctrlElm[proxyMethodName].apply(ctrlElm, args));
  };
}


const PROP_WILL_CHG = '$$wc';
const PROP_DID_CHG = '$$dc';
