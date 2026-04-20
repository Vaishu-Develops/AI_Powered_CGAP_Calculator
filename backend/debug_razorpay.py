import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from razorpay_utils import create_order
import json

try:
    print("Testing Razorpay Order Creation...")
    # Attempt to create a test order for ₹1 (100 paise)
    order = create_order(100, receipt="test_receipt_123")
    print("Order Created Successfully!")
    print(json.dumps(order, indent=4))
except Exception as e:
    print("\nFAILED to create order!")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {str(e)}")
    
    # Check if it's a configuration issue
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    
    print("\nEnvironment Information:")
    print(f"RAZORPAY_KEY_ID exists: {bool(key_id)}")
    if key_id:
        print(f"RAZORPAY_KEY_ID starts with: {key_id[:8]}...")
    print(f"RAZORPAY_KEY_SECRET exists: {bool(key_secret)}")
