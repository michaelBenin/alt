import assign from 'object-assign'

import AltStore from '../AltStore'
import { getInternalMethods } from './AltUtils'
import {
  StoreMixinEssentials,
  StoreMixinListeners
} from './StoreMixins'
import {
  ALL_LISTENERS,
  LIFECYCLE,
  LISTENERS,
  PUBLIC_METHODS,
  STATE_CONTAINER
} from '../symbols/symbols'

function doSetState(store, storeInstance, state) {
  if (!state) {
    return
  }

  const { config } = storeInstance.StoreModel

  const nextState = typeof state === 'function'
    ? state(storeInstance[STATE_CONTAINER])
    : state

  storeInstance[STATE_CONTAINER] = config.setState.call(
    store,
    storeInstance[STATE_CONTAINER],
    nextState
  )

  if (!store.alt.dispatcher.isDispatching()) {
    store.emitChange()
  }
}

export function createStoreConfig(globalConfig, StoreModel) {
  StoreModel.config = assign({
    getState(state) {
      return Object.keys(state).reduce((obj, key) => {
        obj[key] = state[key]
        return obj
      }, {})
    },
    setState: assign
  }, globalConfig, StoreModel.config)
}

export function transformStore(transforms, StoreModel) {
  return transforms.reduce((Store, transform) => transform(Store), StoreModel)
}

export function createStoreFromObject(alt, StoreModel, key) {
  let storeInstance

  const StoreProto = {}
  StoreProto[ALL_LISTENERS] = []
  StoreProto[LIFECYCLE] = {}
  StoreProto[LISTENERS] = {}

  assign(StoreProto, {
    _storeName: key,
    alt,
    dispatcher: alt.dispatcher,
    getInstance() {
      return storeInstance
    },
    setState(nextState) {
      doSetState(this, storeInstance, nextState)
    }
  }, StoreMixinListeners, StoreMixinEssentials, StoreModel)

  // bind the store listeners
  /* istanbul ignore else */
  if (StoreProto.bindListeners) {
    StoreMixinListeners.bindListeners.call(
      StoreProto,
      StoreProto.bindListeners
    )
  }

  // bind the lifecycle events
  /* istanbul ignore else */
  if (StoreProto.lifecycle) {
    Object.keys(StoreProto.lifecycle).forEach((event) => {
      StoreMixinListeners.on.call(
        StoreProto,
        event,
        StoreProto.lifecycle[event]
      )
    })
  }

  // create the instance and assign the public methods to the instance
  storeInstance = assign(
    new AltStore(alt, StoreProto, StoreProto.state, StoreModel),
    StoreProto.publicMethods,
    { displayName: key }
  )

  return storeInstance
}

export function createStoreFromClass(alt, StoreModel, key, ...argsForClass) {
  let storeInstance
  const { config } = StoreModel

  // Creating a class here so we don't overload the provided store's
  // prototype with the mixin behaviour and I'm extending from StoreModel
  // so we can inherit any extensions from the provided store.
  class Store extends StoreModel {
    constructor(...args) {
      super(...args)
    }
  }

  assign(Store.prototype, StoreMixinListeners, StoreMixinEssentials, {
    _storeName: key,
    alt: alt,
    dispatcher: alt.dispatcher,
    getInstance() {
      return storeInstance
    },
    setState(nextState) {
      doSetState(this, storeInstance, nextState)
    }
  })

  Store.prototype[ALL_LISTENERS] = []
  Store.prototype[LIFECYCLE] = {}
  Store.prototype[LISTENERS] = {}
  Store.prototype[PUBLIC_METHODS] = {}

  const store = new Store(...argsForClass)

  if (config.datasource) {
    StoreMixinEssentials.exportAsync.call(Store.prototype, config.datasource)
  }

  storeInstance = assign(
    new AltStore(
      alt,
      store,
      store[alt.config.stateKey] || store[config.stateKey] || null,
      StoreModel
    ),
    getInternalMethods(StoreModel),
    { displayName: key }
  )

  return storeInstance
}
