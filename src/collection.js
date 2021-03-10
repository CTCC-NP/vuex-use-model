import _ from 'lodash'

export default class CollectionModel {

  constructor(collection) {
    this._collection = collection || []
  }

  add(instance) {
    this._collection.push(instance)
  }

  get states() {
    return _.map(this._collection, (instance) => {
      return instance.state
    })
  }
}
