import wasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'

export const onnxWasmPaths = {
  mjs: wasmModuleUrl,
  wasm: wasmBinaryUrl
}
