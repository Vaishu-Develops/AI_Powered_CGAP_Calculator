import razorpay
import os
import time
from dotenv import load_dotenv

load_dotenv(override=True)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_order(amount_in_paise: int, currency: str = "INR", receipt: str = None):
    """
    Creates a Razorpay order.
    Amount should be in the smallest currency unit (e.g., paise for INR).
    """
    data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "app": "Saffron CGPA",
            "type": "pro_upgrade"
        }
    }
    # Razorpay API can intermittently close connection in dev/test mode; retry briefly.
    last_error = None
    for attempt in range(3):
        try:
            return client.order.create(data=data)
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(0.6)

    raise last_error

def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str):
    """
    Verifies the Razorpay payment signature.
    """
    params_dict = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature
    }
    try:
        client.utility.verify_payment_signature(params_dict)
        return True
    except Exception:
        return False
