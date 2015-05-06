import Symbol from 'es-symbol'
import {
  ACTION_KEY,
  ALL_LISTENERS,
  LIFECYCLE,
  LISTENERS,
  PUBLIC_METHODS
} from '../symbols/symbols'

export const StoreMixinEssentials = {
  waitFor(...sources) {
    if (!sources.length) {
      throw new ReferenceError('Dispatch tokens not provided')
    }

    let sourcesArray = sources
    if (sources.length === 1) {
      sourcesArray = Array.isArray(sources[0]) ? sources[0] : sources
    }

    const tokens = sourcesArray.map((source) => {
      return source.dispatchToken || source
    })

    this.dispatcher.waitFor(tokens)
  },

  exportAsync(asyncMethods) {
    const toExport = Object.keys(asyncMethods).reduce((publicMethods, methodName) => {
      const asyncSpec = asyncMethods[methodName]

      const validHandlers = ['success', 'error', 'loading']
      validHandlers.forEach((handler) => {
        if (asyncSpec[handler] && !asyncSpec[handler][ACTION_KEY]) {
          throw new Error(`${handler} handler must be an action function`)
        }
      })

      publicMethods[methodName] = (...args) => {
        const state = this.getInstance().getState()
        const value = asyncSpec.cache(state, ...args)

        // if we don't have it in cache then fetch it
        if (!value) {
          if (asyncSpec.loading) asyncSpec.loading()
          asyncSpec.fetch(state, ...args)
            .then(asyncSpec.success)
            .catch(asyncSpec.error)
        } else {
          // otherwise emit the change now
          this.emitChange()
        }
      }

      return publicMethods
    }, {})

    this.exportPublicMethods(toExport)
  },

  exportPublicMethods(methods) {
    Object.keys(methods).forEach((methodName) => {
      if (typeof methods[methodName] !== 'function') {
        throw new TypeError('exportPublicMethods expects a function')
      }

      this[PUBLIC_METHODS][methodName] = methods[methodName]
    })
  },

  emitChange() {
    this.getInstance().emitChange()
  }
}

export const StoreMixinListeners = {
  on(lifecycleEvent, handler) {
    this[LIFECYCLE][lifecycleEvent] = handler.bind(this)
  },

  bindAction(symbol, handler) {
    if (!symbol) {
      throw new ReferenceError('Invalid action reference passed in')
    }
    if (typeof handler !== 'function') {
      throw new TypeError('bindAction expects a function')
    }

    if (handler.length > 1) {
      throw new TypeError(
        `Action handler in store ${this._storeName} for ` +
        `${(symbol[ACTION_KEY] || symbol).toString()} was defined with 2 ` +
        `parameters. Only a single parameter is passed through the ` +
        `dispatcher, did you mean to pass in an Object instead?`
      )
    }

    // You can pass in the constant or the function itself
    const key = symbol[ACTION_KEY] ? symbol[ACTION_KEY] : symbol
    this[LISTENERS][key] = handler.bind(this)
    this[ALL_LISTENERS].push(Symbol.keyFor(key))
  },

  bindActions(actions) {
    Object.keys(actions).forEach((action) => {
      const symbol = actions[action]
      const matchFirstCharacter = /./
      const assumedEventHandler = action.replace(matchFirstCharacter, (x) => {
        return `on${x[0].toUpperCase()}`
      })
      let handler = null

      if (this[action] && this[assumedEventHandler]) {
        // If you have both action and onAction
        throw new ReferenceError(
          `You have multiple action handlers bound to an action: ` +
          `${action} and ${assumedEventHandler}`
        )
      } else if (this[action]) {
        // action
        handler = this[action]
      } else if (this[assumedEventHandler]) {
        // onAction
        handler = this[assumedEventHandler]
      }

      if (handler) {
        this.bindAction(symbol, handler)
      }
    })
  },

  bindListeners(obj) {
    Object.keys(obj).forEach((methodName) => {
      const symbol = obj[methodName]
      const listener = this[methodName]

      if (!listener) {
        throw new ReferenceError(
          `${methodName} defined but does not exist in ${this._storeName}`
        )
      }

      if (Array.isArray(symbol)) {
        symbol.forEach((action) => {
          this.bindAction(action, listener)
        })
      } else {
        this.bindAction(symbol, listener)
      }
    })
  }

}
