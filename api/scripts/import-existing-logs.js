const fs = require("fs/promises");
const path = require("path");
const { saveSessionLog } = require("../src/shared/logStore");
const { parseSessionLogMarkdown } = require("../src/shared/logParser");

const logsDir = path.resolve(__dirname, "../../logs");

async function main() {
  const entries = await fs.readdir(logsDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "session-log-template.md")
    .map((entry) => entry.name)
    .sort();

  let imported = 0;
  const failures = [];

  for (const fileName of markdownFiles) {
    const fullPath = path.join(logsDir, fileName);

    try {
      const markdown = await fs.readFile(fullPath, "utf8");
      const payload = parseSessionLogMarkdown(markdown, {
        fileName,
        importedAt: new Date().toISOString(),
        source: "markdown-import"
      });

      const result = await saveSessionLog(payload);
      imported += 1;
      console.log(`Imported ${fileName} -> ${result.blobName}`);
    } catch (error) {
      failures.push({ fileName, error: error.message });
      console.error(`Failed ${fileName}: ${error.message}`);
    }
  }

  console.log(`Imported ${imported} log(s).`);

  if (failures.length) {
    console.log("Failures:");
    failures.forEach((failure) => {
      console.log(`- ${failure.fileName}: ${failure.error}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});