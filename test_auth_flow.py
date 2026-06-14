import urllib.request
import urllib.parse
import json

base_url = "http://localhost:5001/api/auth"

# Step 1: Register a new user
import random
rand_num = random.randint(1000, 9999)
register_url = f"{base_url}/register"
register_data = {
    "username": f"testuser_flow_{rand_num}",
    "email": f"flow_test_{rand_num}@example.com",
    "password": "testpassword123"
}
data_bytes = json.dumps(register_data).encode("utf-8")
req = urllib.request.Request(register_url, data=data_bytes, headers={"Content-Type": "application/json"}, method="POST")

token = None
try:
    print("Sending registration request...")
    with urllib.request.urlopen(req) as res:
        print("Registration Response Status:", res.status)
        resp_body = res.read().decode()
        print("Registration Response Body:", resp_body)
        resp_json = json.loads(resp_body)
        token = resp_json.get("token")
        print(f"Extracted Token: {token[:20]}...")
except Exception as e:
    if hasattr(e, "read"):
        print("Registration Failed:", e.code, e.read().decode())
    else:
        print("Registration Failed:", e)

# Step 2: Request get-user to see if header authentication works
if token:
    get_user_url = f"{base_url}/get-user"
    req_get = urllib.request.Request(
        get_user_url, 
        headers={"Authorization": f"Bearer {token}"},
        method="GET"
    )

    try:
        print("\nSending get-user request with Authorization header...")
        with urllib.request.urlopen(req_get) as res:
            print("get-user Response Status:", res.status)
            print("get-user Response Body:", res.read().decode())
    except Exception as e:
        if hasattr(e, "read"):
            print("get-user Failed:", e.code, e.read().decode())
        else:
            print("get-user Failed:", e)
else:
    print("\nSkipping get-user request as registration failed or returned no token.")
