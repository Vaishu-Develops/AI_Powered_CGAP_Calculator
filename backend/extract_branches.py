import os
import json

data_dir = r"d:\CGPA Calculator\backend\data"
branches = []

for filename in os.listdir(data_dir):
    if filename.startswith("curriculum_") and filename.endswith(".json"):
        with open(os.path.join(data_dir, filename), 'r', encoding='utf-8') as f:
            data = json.load(f)
            metadata = data.get("metadata", {})
            branch_key = filename.replace("curriculum_", "").replace(".json", "").lower()
            name = metadata.get("branch_name", branch_key.upper())
            branches.append({"id": branch_key, "name": name})

branches.sort(key=lambda x: x['name'])
print("total:", len(branches))
print(json.dumps(branches, indent=4))
