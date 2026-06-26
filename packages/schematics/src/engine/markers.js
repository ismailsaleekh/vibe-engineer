const START_PREFIX = "/* vibe-engineer-generated:start ";
const START_SUFFIX = " */";
const END_MARKER = "/* vibe-engineer-generated:end */";

function canonicalMarker(metadata) {
  return {
    schematicId: metadata.schematicId,
    schematicVersion: metadata.schematicVersion,
    blockId: metadata.blockId,
    inputFingerprint: metadata.inputFingerprint,
    templateFingerprint: metadata.templateFingerprint
  };
}

function ensureTrailingNewline(content) {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export function writeGeneratedBlock(content, metadata) {
  const marker = canonicalMarker(metadata);
  return `${START_PREFIX}${JSON.stringify(marker)}${START_SUFFIX}\n${ensureTrailingNewline(content)}${END_MARKER}\n`;
}

export function parseGeneratedBlock(text) {
  if (typeof text !== "string") return { ok: false, reason: "not_text" };
  const lines = text.split("\n");
  if (lines.length < 3) return { ok: false, reason: "missing_markers" };
  const first = lines[0];
  const lastMeaningful = lines[lines.length - 1] === "" ? lines[lines.length - 2] : lines[lines.length - 1];
  if (!first.startsWith(START_PREFIX) || !first.endsWith(START_SUFFIX) || lastMeaningful !== END_MARKER) return { ok: false, reason: "missing_markers" };
  const jsonText = first.slice(START_PREFIX.length, first.length - START_SUFFIX.length);
  let marker;
  try { marker = JSON.parse(jsonText); } catch { return { ok: false, reason: "invalid_marker_json" }; }
  for (const key of ["schematicId", "schematicVersion", "blockId", "inputFingerprint", "templateFingerprint"]) {
    if (typeof marker[key] !== "string" || marker[key].length === 0) return { ok: false, reason: "invalid_marker_field", key };
  }
  const bodyLines = lines.slice(1, lines.length - (lines[lines.length - 1] === "" ? 2 : 1));
  return { ok: true, marker, body: `${bodyLines.join("\n")}\n` };
}

export function parseGeneratedSections(text) {
  if (typeof text !== "string") return [];
  const sections = [];
  let offset = 0;
  while (offset < text.length) {
    const start = text.indexOf(START_PREFIX, offset);
    if (start === -1) break;
    const markerLineEnd = text.indexOf("\n", start);
    if (markerLineEnd === -1) break;
    const markerLine = text.slice(start, markerLineEnd);
    if (!markerLine.endsWith(START_SUFFIX)) { offset = markerLineEnd + 1; continue; }
    const endMarkerStart = text.indexOf(END_MARKER, markerLineEnd + 1);
    if (endMarkerStart === -1) break;
    const endLineEnd = text.indexOf("\n", endMarkerStart);
    const end = endLineEnd === -1 ? endMarkerStart + END_MARKER.length : endLineEnd + 1;
    const blockText = text.slice(start, end);
    const parsed = parseGeneratedBlock(blockText);
    if (parsed.ok) sections.push({ ...parsed, start, end, text: blockText });
    offset = end;
  }
  return sections;
}

export function markerMatches(actual, expected) {
  const left = canonicalMarker(actual);
  const right = canonicalMarker(expected);
  return JSON.stringify(left) === JSON.stringify(right);
}

export { END_MARKER, START_PREFIX, START_SUFFIX, ensureTrailingNewline };
