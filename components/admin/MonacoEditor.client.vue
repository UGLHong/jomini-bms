<script setup lang="ts">
import * as monaco from 'monaco-editor'

const props = withDefaults(
  defineProps<{
    modelValue: string
    language?: 'json' | 'yaml' | 'plaintext'
    jsonSchema?: object
    schemaUri?: string
    height?: string
    readOnly?: boolean
    options?: monaco.editor.IStandaloneEditorConstructionOptions
  }>(),
  {
    language: 'json',
    schemaUri: 'inmemory://schema/products.json',
    height: '480px',
    readOnly: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'validate', markers: monaco.editor.IMarker[]): void
}>()

const container = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null

function applySchema() {
  if (props.language !== 'json' || !props.jsonSchema) return
  const schemas = [
    {
      uri: props.schemaUri,
      fileMatch: [props.schemaUri],
      schema: props.jsonSchema,
    },
  ]
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas,
  })
}

onMounted(() => {
  if (!container.value) return
  model = monaco.editor.createModel(
    props.modelValue,
    props.language,
    monaco.Uri.parse(props.schemaUri),
  )
  applySchema()
  editor = monaco.editor.create(container.value, {
    model,
    automaticLayout: true,
    readOnly: props.readOnly,
    minimap: { enabled: false },
    tabSize: 2,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    ...props.options,
  })
  editor.onDidChangeModelContent(() => {
    if (!model) return
    const value = model.getValue()
    emit('update:modelValue', value)
    emit('validate', monaco.editor.getModelMarkers({ resource: model.uri }))
  })
  editor.onDidChangeModelDecorations(() => {
    if (!model) return
    emit('validate', monaco.editor.getModelMarkers({ resource: model.uri }))
  })
})

watch(
  () => props.modelValue,
  (next) => {
    if (!model) return
    if (next !== model.getValue()) {
      model.setValue(next)
    }
  },
)

watch(
  () => props.jsonSchema,
  () => applySchema(),
  { deep: true },
)

watch(
  () => props.readOnly,
  (value) => editor?.updateOptions({ readOnly: value }),
)

onBeforeUnmount(() => {
  editor?.dispose()
  model?.dispose()
  editor = null
  model = null
})
</script>

<template>
  <div
    ref="container"
    class="overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700"
    :style="{ height }"
  />
</template>
