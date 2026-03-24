
import json
import os
import sys

# Add the current directory to sys.path so we can import from backend
sys.path.append(os.getcwd())

from backend.curriculum_service import CurriculumService

def test_loading():
    service = CurriculumService()
    # Mock loading the CSE curriculum
    # Depending on how CurriculumService is implemented, we might need to point it to the file
    # Or it might load all by default.
    # Looking at the code in previous turns, it seems to load based on branch.
    
    # Let's inspect how it loads.
    # It seems to scan the data directory.
    
    # We will try to load 'CSE' curriculum manually or via get_subject_info
    
    # Check if OHS352 and OME354 are in the subjects map for CSE
    cse_subjects = service.get_curriculum('CSE')
    
    if not cse_subjects:
        print("Failed to load CSE curriculum")
        return

    print(f"Total subjects loaded: {len(cse_subjects)}")
    
    # Check OHS352
    if 'OHS352' in cse_subjects:
        print(f"SUCCESS: OHS352 found: {cse_subjects['OHS352']}")
    else:
        print("FAILURE: OHS352 not found")

    # Check OME354
    if 'OME354' in cse_subjects:
        print(f"SUCCESS: OME354 found: {cse_subjects['OME354']}")
    else:
        print("FAILURE: OME354 not found")

if __name__ == "__main__":
    test_loading()
