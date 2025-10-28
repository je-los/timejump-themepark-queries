from pathlib import Path
import re
text = Path("web/src/pages/admin.jsx").read_text()
segment = text[text.index("Parking Lots"):]
match = re.search(r"columns=\[[^\]]+\]", segment)
print(match.group(0) if match else "no match")
