import Alt from './'
import PromiseDispatcher from './utils/PromiseDispatcher'

const dispatcher = new PromiseDispatcher()

const token = dispatcher.register((payload) => {
  console.log(1)
  return Promise.resolve('hello from 1')
})

const token2 = dispatcher.register((payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(2)
      resolve('hi from 2, dont mind me im just async')
    }, 10)
  })
})

const token3 = dispatcher.register((payload, context) => {
  return dispatcher.waitFor(context, [token2, token4]).then(() => {
    console.log(3)
    return Promise.resolve('sup from 3')
  })
})

const token4 = dispatcher.register((payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(2.5)
      resolve('4 was registered late and came in really late')
    }, 1000)
  })
})

dispatcher.dispatch({ hello: 'world' }).then(x => console.log('Done', x)).catch(e => console.log('uhoh', e))
