import yaml
import sys

with open('/Users/macos/.gemini/antigravity/brain/40b364b5-f6e6-4491-9cf7-bc7dbdd7e8c4/.system_generated/steps/222/output.txt', 'r') as f:
    try:
        data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error parsing YAML: {e}")
        sys.exit(1)

def find_nodes(node, names):
    results = []
    if isinstance(node, dict):
        name = str(node.get('name', '')).lower()
        if any(n in name for n in names):
            results.append({"id": node.get("id"), "name": node.get("name"), "type": node.get("type", "unknown")})
        
        for v in node.values():
            results.extend(find_nodes(v, names))
    elif isinstance(node, list):
        for item in node:
            results.extend(find_nodes(item, names))
    return results

components = data.get('components', {})
results = []
for k, v in components.items():
    name = str(v.get('name', '')).lower()
    if 'icon' in name or 'calendar' in name or 'clock' in name or 'tag' in name or 'share' in name or 'bag' in name or 'coin' in name or 'sparkle' in name:
        results.append(f"{v.get('id')} - {v.get('name')}")

print("Found components:")
for r in results: print(r)

