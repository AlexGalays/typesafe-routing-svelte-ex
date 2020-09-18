type NativeMouseEvent = MouseEvent

declare namespace DOM {
  export type MouseEvent<T> = NativeMouseEvent & {target: EventTarget & T}
}