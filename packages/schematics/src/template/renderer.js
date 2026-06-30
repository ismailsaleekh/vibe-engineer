const FORBIDDEN_FEATURES = Object.freeze([
  { token: "{{{", reason: "triple_mustache_raw" },
  { token: "{{&", reason: "raw_ampersand" },
  { token: "{{=", reason: "delimiter_mutation" },
  { token: "{{!<", reason: "template_inheritance" },
  { token: "{{>", reason: null },
]);

const FORBIDDEN_TEXT = Object.freeze([
  "child_process",
  "exec(",
  "spawn(",
  "fetch(",
  "http://",
  "https://",
  "Date.now",
  "new Date",
  "Math.random",
  "process.env",
  "require(",
  "eval(",
  "Function(",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

export function validateTemplateSource(source, allowedPartials = new Set()) {
  if (typeof source !== "string") fail("unsafe_template", "Template source must be a string.");
  for (const item of FORBIDDEN_FEATURES) {
    if (item.reason && source.includes(item.token))
      fail("unsafe_template", `Forbidden template feature: ${item.reason}.`, {
        feature: item.reason,
      });
  }
  for (const token of FORBIDDEN_TEXT) {
    if (source.includes(token))
      fail("unsafe_template", `Forbidden template text capability: ${token}.`, { token });
  }
  let offset = 0;
  while (true) {
    const open = source.indexOf("{{", offset);
    if (open === -1) break;
    const close = source.indexOf("}}", open + 2);
    if (close === -1) fail("unsafe_template", "Unclosed Mustache tag.");
    const tag = source.slice(open + 2, close).trim();
    offset = close + 2;
    if (tag.length === 0) fail("unsafe_template", "Empty Mustache tag is forbidden.");
    const sigil = tag[0];
    if (["#", "^", "/", "!"].includes(sigil)) continue;
    if (sigil === ">") {
      const name = tag.slice(1).trim();
      if (!/^[A-Za-z0-9_.-]+$/.test(name))
        fail("unsafe_template", "Partial names must be static identifiers.", { partial: name });
      if (!allowedPartials.has(name))
        fail("unsafe_template", "Partial must be declared by manifest.", { partial: name });
      continue;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(tag))
      fail("unsafe_template", "Template variables must be normalized bag paths only.", { tag });
  }
}

function lookup(context, key) {
  if (key === ".") return context[context.length - 1];
  const parts = key.split(".");
  for (let index = context.length - 1; index >= 0; index -= 1) {
    let current = context[index];
    let found = true;
    for (const part of parts) {
      if (isObject(current) && Object.prototype.hasOwnProperty.call(current, part))
        current = current[part];
      else {
        found = false;
        break;
      }
    }
    if (found) return current;
  }
  return undefined;
}

function renderTokens(source, context, partials, allowedPartials) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("{{", index);
    if (open === -1) return output + source.slice(index);
    output += source.slice(index, open);
    const close = source.indexOf("}}", open + 2);
    if (close === -1) fail("unsafe_template", "Unclosed Mustache tag.");
    const tag = source.slice(open + 2, close).trim();
    const sigil = tag[0];
    index = close + 2;
    if (sigil === "!") continue;
    if (sigil === ">") {
      const name = tag.slice(1).trim();
      if (!allowedPartials.has(name) || typeof partials[name] !== "string")
        fail("unsafe_template", "Partial was not declared.", { partial: name });
      output += renderTokens(partials[name], context, partials, allowedPartials);
      continue;
    }
    if (sigil === "#" || sigil === "^") {
      const sectionName = tag.slice(1).trim();
      const closeTag = `{{/${sectionName}}}`;
      const closeIndex = source.indexOf(closeTag, index);
      if (closeIndex === -1) fail("unsafe_template", `Section ${sectionName} is not closed.`);
      const body = source.slice(index, closeIndex);
      index = closeIndex + closeTag.length;
      const value = lookup(context, sectionName);
      const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      if (sigil === "^" ? !truthy : truthy) {
        if (Array.isArray(value)) {
          for (const item of value)
            output += renderTokens(body, [...context, item], partials, allowedPartials);
        } else if (isObject(value))
          output += renderTokens(body, [...context, value], partials, allowedPartials);
        else output += renderTokens(body, context, partials, allowedPartials);
      }
      continue;
    }
    if (sigil === "/") fail("unsafe_template", `Unexpected section close ${tag}.`);
    const value = lookup(context, tag);
    output += value === undefined || value === null ? "" : String(value);
  }
  return output;
}

export function renderTemplate(source, variables, partials = {}) {
  const allowedPartials = new Set(Object.keys(partials));
  validateTemplateSource(source, allowedPartials);
  for (const partial of Object.values(partials)) validateTemplateSource(partial, allowedPartials);
  return renderTokens(source, [variables], partials, allowedPartials);
}
