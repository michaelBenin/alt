import Alt from './'
import PromiseDispatcher from './utils/PromiseDispatcher'

const alt = new Alt({
  dispatcher: new PromiseDispatcher()
})

const TodoActions = alt.createActions({
  fetchTodo(id) {
    return this.dispatch(id)
  },

  addTodo(obj) {
    return this.dispatch(obj)
  }
})

class TodoStore {
  constructor() {
    this.todos = {}
    this.bindListeners({
      fetchTodo: TodoActions.fetchTodo,
      addTodo: TodoActions.addTodo
    })
  }

  addTodo(obj) {
    return Promise.resolve(this.todos[obj.id] = obj)
  }

  fetchTodo(id) {
    return new Promise((resolve, reject) => {
      console.log('fetching...', id)
      setTimeout(() => {
        console.log('done')
        const todo = { id, text: 'awesome' }
        resolve(todo)
        TodoActions.addTodo(todo)
      }, 1000)
    })
  }
}

const Store = alt.createStore(TodoStore)

// called once promise is resolved
Store.listen((state) => {
  console.log('called', state)
})

// hey, a promise!
TodoActions.fetchTodo(2).then(x => console.log('=', x))
