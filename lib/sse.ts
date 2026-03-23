import { EventEmitter } from "events"
declare global { var sseEmitter: EventEmitter | undefined }
const emitter: EventEmitter = global.sseEmitter ?? new EventEmitter()
global.sseEmitter = emitter
emitter.setMaxListeners(200)
export function broadcast(type: string, payload?: unknown) {
  emitter.emit("update", JSON.stringify({ type, payload }))
}
export default emitter
