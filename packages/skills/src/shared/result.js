export function ok(value, meta = {}) {
  return Object.freeze({ ok: true, value, meta });
}

export function blocked(reason, details = {}) {
  return Object.freeze({ ok: false, reason, ...details });
}

export function validationBlocked(stage, errors) {
  return blocked('validation_failed', { stage, errors: Object.freeze([...(errors ?? [])]) });
}
