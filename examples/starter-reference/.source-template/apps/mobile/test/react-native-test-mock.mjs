import { createElement } from "react";

function toChildrenArray(children) {
  return Array.isArray(children) ? children : [children];
}

export function View(props = {}) {
  return createElement("View", props, ...toChildrenArray(props.children));
}

export function Text(props = {}) {
  return createElement("Text", props, ...toChildrenArray(props.children));
}

export const StyleSheet = {
  create(styles) {
    return styles;
  },
};
