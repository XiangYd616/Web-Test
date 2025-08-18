// 全局类型声明文件
declare global {
  // 允许任何属性访问
  interface Window {
    [key: string]: any
}

  // 全局变量声明
  var process: any;
  var global: any;
  var __dirname: string;
  var __filename: string;
  var require: any;
  var module: any;
  var exports: any; // React相关
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
}
  }
}

// 模块声明
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}
declare module '*.scss' {
  const content: { [className: string]: string }
  export default content
}
declare module '*.less' {
  const content: { [className: string]: string }
  export default content
}
declare module '*.png' {
  const src: string;
  export default src
}
declare module '*.jpg' {
  const src: string;
  export default src
}
declare module '*.jpeg' {
  const src: string;
  export default src
}
declare module '*.gif' {
  const src: string;
  export default src
}
declare module '*.svg' {
  const src: string;
  export default src
}
declare module '*.json' {
  const value: any;
  export default value
}

// 通用模块声明;
declare module '*' {
  const content: any;
  export default content;
  export = content
}

// 类型别名
type AnyFunction = (...args: any[]) => any;
type AnyObject = { [key: string]: any }
type AnyArray = any[] // 导出空对象以使此文件成为模块
export {}
