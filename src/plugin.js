import Manager from './manager'

export function installORM(manager) {
  return (store) => {
    const definition = manager.getModuleDefinition()

    manager.bindStore(store)

    store.registerModule(manager.moduleName, Object.assign({
      namespaced: true,
    }, definition))

    console.log('install ORM: ', store)
  }
}

export function createORM(moduleName = 'database') {
  return new Manager(moduleName)
}
