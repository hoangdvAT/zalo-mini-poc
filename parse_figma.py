import json
import sys

with open('/Users/macos/.gemini/antigravity/brain/40b364b5-f6e6-4491-9cf7-bc7dbdd7e8c4/.system_generated/steps/222/output.txt', 'r') as f:
    text = f.read()
    
# Find the JSON part
json_str = None
for line in text.split('\n'):
    if line.strip().startswith('{'):
        json_str = line
        break

if not json_str:
    print("No JSON found")
    sys.exit(1)

data = json.loads(json_str)

def find_nodes(node, names):
    results = []
    node_name = node.get('name', '').lower()
    
    if any(n in node_name for n in names):
        results.append({"id": node.get("id"), "name": node.get("name"), "type": node.get("type")})
        
    for child in node.get("children", []):
        results.extend(find_nodes(child, names))
        
    return results

# Find any nodes with 'icon', 'vector', 'svg', 'bag', 'coin', 'hand', 'calendar', etc in name
targets = find_nodes(data, ['icon', 'bag', 'coin', 'hand', 'calendar', 'globe', 'tag', 'clock', 'sparkle', 'share', 'step'])
for t in targets:
    print(f"{t['id']} - {t['name']} ({t['type']})")
    
