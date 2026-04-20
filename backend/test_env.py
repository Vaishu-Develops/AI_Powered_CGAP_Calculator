import os
from dotenv import load_dotenv

# Test exactly how the backend reads the keys
load_dotenv(override=True)
print(f"RAZORPAY_KEY_ID: {os.getenv('RAZORPAY_KEY_ID')}")
print(f"RAZORPAY_KEY_SECRET length: {len(os.getenv('RAZORPAY_KEY_SECRET', ''))}")
