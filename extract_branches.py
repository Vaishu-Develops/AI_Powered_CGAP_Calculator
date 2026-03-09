import json, glob

res = []
for f in glob.glob("backend/data/curriculum_*.json"):
    with open(f, encoding="utf-8") as file:
        data = json.load(file)
        
        branch_id = 'unknown'
        name = 'Unknown'
        
        if "branch" in data and "branch_full_name" in data:
            branch_id = data["branch"].lower()
            name = data["branch_full_name"]
        elif "metadata" in data and "branch" in data["metadata"]:
            branch_id = data["metadata"]["branch"].lower()
            name = data["metadata"].get("name", "Unknown")
            
        if branch_id != 'unknown':
            res.append(f"    {{ id: '{branch_id}', name: '{name} ({branch_id.upper()})' }},")

print("const BRANCHES = [\n" + "\n".join(res) + "\n];")
