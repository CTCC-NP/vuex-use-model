import _ from 'lodash'
import Collection from './collection'
import { reactive, toRaw, isRef } from 'vue'

export default class BaseModel {
  static $ns = null
  static $context = null

  _persisted = false
  _state = null
  _id = null

  static get isContextDefined() {
    return !!this.$context
  }

  static get contextConfig() {
    const _contextConfig = {};

    if (typeof this.$context === 'string') {
      _contextConfig.modelName = this.$context
      _contextConfig.fieldName = this.$ns
    }

    return _contextConfig
  }

  static new() {
    const instance = new this()
    instance._initState()

    return instance
  }

  static insert() {

  }

  static insertOrUpdate() {

  }

  static find(id) {
    const instance = new this()
    const recordKey = id
    instance._setId(recordKey)
    instance._state = this.state[recordKey]
    instance._persisted = true
    return instance
  }

  static findBy(queryOrFunc) {
    let recordKey, _searched = false

    if (_.isPlainObject(queryOrFunc)) {
      const query = queryOrFunc
      if (_.has(query, 'id')) {
        recordKey = query['id']
        _searched = true
      }
    }

    if (!_searched) {
      recordKey = _.findKey(this.state, queryOrFunc)
    }

    const instance = new this()
    instance._setId(recordKey)
    instance._state = this.state[recordKey]
    instance._persisted = true
    return instance
  }

  static all() {
    const collection = new Collection()
    _.forEach(this.state, (recordValue, recordKey) => {
      const instance = new this()
      instance._setId(recordKey)
      instance._state = recordValue
      instance._persisted = true
      collection.add(instance)
    })
    return collection
  }

  static where(queryOrFunc) {
    const collection = new Collection()
    _.forEach(this.state, (recordValue, recordKey) => {
      if (!!queryOrFunc(recordValue)) {
        const instance = new this()
        instance._setId(recordKey)
        instance._state = recordValue
        instance._persisted = true
        collection.add(instance)
      }
    })

    return collection
  }

  static first() {
    const instance = new this()
    const recordKey = _.keys(this.state)[0]
    instance._setId(recordKey)
    instance._state = this.state[recordKey]
    instance._persisted = true
    return instance
  }

  static last() {
    const instance = new this()
    const recordKey = _.last(_.keys(this.state))
    instance._setId(recordKey)
    instance._state = this.state[recordKey]
    instance._persisted = true
    return instance
  }

  _initState() {
    const schemaObj = Object.assign({
      id: {
        type: Number,
        default: () => Date.now() + 1000 * Math.floor(Math.random())
      },
    }, this.constructor.$schema)

    const rawState = Object(null)

    _.forEach(schemaObj, (fieldOptions, fieldKey) => {
      const { type, default: defaultValue } = fieldOptions
      const fieldValue = (defaultValue && typeof defaultValue === 'function') ? defaultValue.apply(null) : (
        type === Collection && _.isNil(defaultValue) ? Object(null) : (
          (type === Object || type === Array) && _.isNil(defaultValue) ? (new type()) : (
            defaultValue !== undefined ? defaultValue : null
          )
        )
      )

      if (fieldKey === 'id') {
        this._setId(fieldValue)
      } else {
        rawState[fieldKey] = fieldValue
      }
    })

    this._state = reactive(rawState);
  }

  _getGlobalMutation(mutation) {
    return `${this.$orm.moduleName}/${this.$model.name}-${mutation}`
  }

  _commitStore(mutation, payload) {
    this.$orm.store.commit(this._getGlobalMutation(mutation), payload)
  }

  _reloadState() {
    this._state = this.$model.state[this._id]
  }

  _setId(value) {
    this._id = value
  }

  get $model() {
    return this.__model__
  }

  get _contextualPath() {
    const value = [ ...(this.$model.isContextDefined ? this.$model.context._contextualPath : []), [this.$model.$ns, this._id] ]
    return value
  }

  get _meta() {
    return { id: this.id, modelStatePath: this.$model.statePath }
  }

  get id() {
    return this._id
  }

  get isPersisted() {
    return this._persisted
  }

  get state() {
    const self = this
    return new Proxy(this._state || {}, {
      get(target, propKey, receiver) {
        if (propKey === 'id') {
          return self.id
        }
        return Reflect.get(target, propKey, receiver);
      },
      set(target, propKey, value, receiver) {
        return Reflect.set(target, propKey, value, receiver);
      }
    })
  }

  save() {
    this._commitStore('SET_RECORD', { _meta: this._meta, payload: toRaw(this._state) })
    this._persisted = true
    this._reloadState()
  }

  destroy() {
    this._commitStore('DELETE_RECORD', { _meta: this._meta })
  }

  update(stateOrFunc, updateOptions) {
    const { patching=false } = updateOptions;
    // ...
  }

  commit(mutation, payload) {
    if (this.isPersisted) {
      this._commitStore(mutation, { _meta: this._meta, payload})
    } else {
      this[mutation].call(null, this._state, payload)
    }
  }
}
