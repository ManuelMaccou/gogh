export function isObject(variable) {
    return Object.prototype.toString.call(variable) === '[object Object]';
  }