const zlib = require("zlib");

// Minimal reader for the PDFs pdfkit produces, so tests can assert on what a
// label actually says instead of on its byte length.
//
// pdfkit writes one FlateDecode content stream per page and draws standard-14
// text as hex strings in WinAnsi — close enough to latin1 for assertions on
// the French field labels this project prints.

const decodeStreams = (buffer) => {
  const raw = buffer.toString("latin1");
  const streams = [];
  const marker = /stream\r?\n/g;
  let match;
  while ((match = marker.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      streams.push(zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1"));
    } catch (error) {
      // Not a deflated stream (embedded image, font file...) — skip it.
    }
  }
  return streams;
};

// WinAnsi's 0x80-0x9F block holds the typographic characters the labels use
// (ellipsis, em dash, curly quotes) where latin1 has control codes, so those
// bytes are mapped back by hand before assertions run.
const WINANSI_HIGH = {
  0x85: "…",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x96: "–",
  0x97: "—",
};

const readRun = (operand) =>
  [...operand.matchAll(/<([0-9a-fA-F\s]+)>/g)]
    .map((hex) =>
      [...Buffer.from(hex[1].replace(/\s/g, ""), "hex")]
        .map((byte) => WINANSI_HIGH[byte] || String.fromCharCode(byte))
        .join("")
    )
    .join("");

// One entry per page, in page order: { text, images }.
const readPages = (buffer) => {
  return decodeStreams(buffer)
    .filter((stream) => /\bTJ\b/.test(stream))
    .map((stream) => {
      const lines = [];
      let images = 0;
      for (const line of stream.split(/\r?\n/)) {
        const run = line.match(/^\[(.*)\]\s*TJ$/);
        if (run) lines.push(readRun(run[1]));
        if (/\/I\d+\s+Do/.test(line)) images += 1;
      }
      return { text: lines.join("\n"), lines, images };
    });
};

// Counted off the page objects rather than off the content streams: an
// embedded image's compressed bytes can coincidentally look like text
// operators, page objects cannot.
const pageCount = (buffer) =>
  (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

const fullText = (buffer) => readPages(buffer).map((page) => page.text).join("\n");

module.exports = { readPages, pageCount, fullText };
