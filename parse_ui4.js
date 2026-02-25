const fs = require("fs");
const xml = fs.readFileSync("C:/Users/Nickolas/Documents/GitHub/alertaki/ui5.xml", "utf-8");
const regex = /text="([^"]*)"\s+resource-id="([^"]*)"\s+class="([^"]*)"\s+package="([^"]*)"\s+content-desc="([^"]*)"\s+checkable="([^"]*)"\s+checked="([^"]*)"\s+clickable="([^"]*)"\s+enabled="([^"]*)"\s+focusable="([^"]*)"\s+focused="([^"]*)"\s+scrollable="([^"]*)"\s+long-clickable="([^"]*)"\s+password="([^"]*)"\s+selected="([^"]*)"\s+bounds="([^"]*)"/g;
let m;
while ((m = regex.exec(xml)) !== null) {
  const text = m[1];
  const clickable = m[8];
  const bounds = m[16];
  if (text.length > 0) {
    console.log(`"${text}" | clickable=${clickable} | bounds=${bounds}`);
  }
}
