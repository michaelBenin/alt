import EventEmitter from 'eventemitter3'
import assign from 'object-assign'
import Symbol from 'es-symbol'
import * as Sym from './symbols/symbols'

const {
  ALL_LISTENERS,
  LIFECYCLE,
  LISTENERS,
  PUBLIC_METHODS,
  STATE_CONTAINER
} = Sym

// event emitter instance
const EE = Symbol()

export default class AltStore {
  constructor(alt, model, state, StoreModel) {
    this[EE] = new EventEmitter()
    this[LIFECYCLE] = {}
    this[STATE_CONTAINER] = state || model

    this._storeName = model._storeName
    this.boundListeners = model[ALL_LISTENERS]
    this.StoreModel = StoreModel
    if (typeof this.StoreModel === 'object') {
      this.StoreModel.state = assign({}, StoreModel.state)
    }

    assign(this[LIFECYCLE], model[LIFECYCLE])
    assign(this, model[PUBLIC_METHODS])

    // Register dispatcher
    this.dispatchToken = alt.dispatcher.register((payload) => {
      if (model[LIFECYCLE].beforeEach) {
        model[LIFECYCLE].beforeEach(payload, this[STATE_CONTAINER])
      }

      let result = false
      if (model[LISTENERS][payload.action]) {
        try {
          result = model[LISTENERS][payload.action](payload.data)
        } catch (e) {
          if (this[LIFECYCLE].error) {
            this[LIFECYCLE].error(e, payload, this[STATE_CONTAINER])
          } else {
            throw e
          }
        }

        if (result !== false) {
          if (result.then && typeof result.then === 'function') {
            result.then(this.emitChange.bind(this))
          } else {
            this.emitChange()
          }
        }
      }

      if (model[LIFECYCLE].afterEach) {
        model[LIFECYCLE].afterEach(payload, this[STATE_CONTAINER])
      }

      return result
    })

    if (this[LIFECYCLE].init) {
      this[LIFECYCLE].init()
    }
  }

  getEventEmitter() {
    return this[EE]
  }

  emitChange() {
    this[EE].emit('change', this[STATE_CONTAINER])
  }

  listen(cb) {
    this[EE].on('change', cb)
    return () => this.unlisten(cb)
  }

  unlisten(cb) {
    if (this[LIFECYCLE].unlisten) {
      this[LIFECYCLE].unlisten()
    }
    this[EE].removeListener('change', cb)
  }

  getState() {
    return this.StoreModel.config.getState.call(this, this[STATE_CONTAINER])
  }
}
