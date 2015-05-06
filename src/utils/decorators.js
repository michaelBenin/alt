export function createActions(alt, ...args) {
  return function (Actions) {
    return alt.createActions(Actions, {}, ...args)
  }
}

export function createStore(alt, ...args) {
  return function (Store) {
    return alt.createStore(Store, undefined, ...args)
  }
}

export function datasource(source) {
  return function (Store) {
    Store.config = Store.config || {}
    Store.config.datasource = source
    return Store
  }
}
