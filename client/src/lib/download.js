/** Saves `lines` as a plain-text file without a round trip to the server. */
export function downloadText(filename, lines) {
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
