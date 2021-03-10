import _ from 'lodash'
import { isRef, computed } from 'vue'
import { useStore } from 'vuex'

export function useModel(name, context=null, storeKey=null) {
  const store = useStore(storeKey)
  const orm = store.$orm
  let model = orm.findModelByName(name)
  let ctxInstance = null

  if (!model) {
    throw new Error(`Can't find model by name: ${name}`)
  }

  if (model.isContextDefined) {
    ctxInstance = isRef(context) ? context : computed(() => context)
    const { contextConfig: { modelName: ctxModelName } } = model
    const ctxModel = orm.findModelByName(ctxModelName)

    if (!ctxModel) {
      throw new Error(`Can't find contextual model by name: ${name}`)
    }

    // if (ctxInstance && !(typeof ctxInstance === 'object' && ctxInstance instanceof ctxModel)) {
    //   throw new Error(`Mismatch contextual model type: ${ctxModelName}`)
    // }
  }

  const newModel = model.bindTo(ctxInstance)

  return newModel
}
