import _ from 'lodash'
import { validateMutationName } from './util'
import { watch, reactive, toRaw, isRef } from 'vue'


export default class Manager {

  constructor(name) {
    this._store = null
    this._moduleName = name

    this._registeredModelSet = new Set()
    this._wrappedModelMap = new Map()
    this._moduleDefinition = {
      mutations: {},
      getters: {},
      state: {}
    }
  }

  _wrapModelClass(model) {
    const { name, $ns } = model
    const wrappedModel = (new Function('_Model', `
      const ${name} = class Wrapped${name} extends _Model {
        constructor(...args) { super(args) }
      }
      return ${name}
    `))(model)

    const orm = wrappedModel.$orm = this

    wrappedModel.bindTo = function(context) {
      const modelData = {
        __context__: context,
        model: wrappedModel,

        get context() {
          return isRef(this.__context__) ? this.__context__.value : this.__context__
        },

        get contextStatePath() {
          return [..._.flatten(this.context._contextualPath), this.model.$ns]
        },

        get statePath() {
          return this.model.isContextDefined ? this.contextStatePath : [ this.model.$ns ]
        },

        get state() {
          return _.get(orm.state, this.statePath)
        }
      }
      const proxyModel = new Proxy(wrappedModel, {
        construct(wpModel, modelArgs, pxModel) {
          const instance = Reflect.construct(wpModel, modelArgs, pxModel)
          instance.__model__ = proxyModel
          return instance
        },
        get(target, propKey) {
          if (Reflect.has(modelData, propKey)) {
            return Reflect.get(modelData, propKey)
          }
          return Reflect.get(target, propKey)
        },
      })

      return proxyModel
    }

    Object.defineProperties(wrappedModel, {
      'name': {
        enumerable: false,
        configurable: false,
        get() {
          return name
        }
      },
      '$wrapped': {
        enumerable: false,
        configurable: true,
        writable: false,
        value: true,
      },
    })

    Object.defineProperties(wrappedModel.prototype, {
      '$orm': {
        enumerable: false,
        configurable: false,
        get() {
          return orm
        }
      }
      // schema field getter and setter
    })

    return wrappedModel
  }

  _processModel(model) {
    const { name: modelName, $ns: modelNs } = model
    const state = { [modelNs]: {} }
    const mutations = {
      [`${modelName}-SET_RECORD`]: (ormState, { _meta, payload }) => {
        const modelState = _.get(ormState, _meta.modelStatePath)
        console.log('modelStatePath: ', _meta.modelStatePath)
        modelState[_meta.id] = _.omit(payload, '_id')
      },
      [`${modelName}-DELETE_RECORD`]: (ormState, { _meta }) => {
        const modelState = _.get(ormState, _meta.modelStatePath)
        delete modelState[_meta.id]
      }
    }

    Reflect.ownKeys(model.prototype).forEach((methodName) => {
      if (validateMutationName(methodName)) {
        const mutationMethodName = `${modelName}-${methodName}`
        const mutationMethodHandle = model.prototype[methodName]
        mutations[mutationMethodName] = (ormState, { _meta, payload }) => {
          const modelState = _.get(ormState, _meta.modelStatePath)
          mutationMethodHandle.call(null, modelState[_meta.id], payload)
        }
      } else {
        // const propertyDescriptor = Reflect.getOwnPropertyDescriptor(model.prototype, methodName)
        // if (!propertyDescriptor.writable) {
        //   TODO: getter
        // }
      }
    })

    Object.assign(this._moduleDefinition.state, state)
    Object.assign(this._moduleDefinition.mutations, mutations)
  }

  get moduleName() {
    return this._moduleName
  }

  get store() {
    return this._store
  }

  get state() {
    return this._store.state[this._moduleName]
  }

  findModelByName(name) {
    return this._wrappedModelMap.get(name)
  }

  bindStore(store) {
    store.$orm = this
    this._store = store
  }

  registerModel(model, options) {
    this._registeredModelSet.add([model, options])
  }

  getModuleDefinition() {
    this._registeredModelSet.forEach(([model, options]) => {
      this._processModel(model)
      this._wrappedModelMap.set(model.name,  this._wrapModelClass(model))
    })

    const { mutations,  getters, state } = this._moduleDefinition

    return {
      mutations,
      getters,
      state: () => (state)
    }
  }

}
