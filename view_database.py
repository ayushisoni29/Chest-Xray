import os
import sys
from datetime import datetime
from pymongo import MongoClient

def main():
    print("=" * 60)
    print("   CHEST X-RAY AI — MONGODB LOCAL DATABASE VIEWER")
    print("=" * 60)

    try:
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2500)
        # Test connection
        client.admin.command("ping")
    except Exception as e:
        print(f"[!] Could not connect to local MongoDB on port 27017: {e}")
        print("    Please ensure the MongoDB service is running.")
        sys.exit(1)

    db = client["chest_xray_ai"]
    users_col = db["users"]
    pred_col = db["predictions"]

    user_count = users_col.count_documents({})
    pred_count = pred_col.count_documents({})

    print(f"\n[+] Connected to Database: chest_xray_ai")
    print(f"    - Total Registered Users: {user_count}")
    print(f"    - Total Saved Predictions: {pred_count}\n")

    # Disease breakdown
    classes = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]
    print("--- PREDICTION BREAKDOWN BY DISEASE ---")
    for cls in classes:
        count = pred_col.count_documents({"predicted_class": cls})
        print(f"  • {cls:<16}: {count} scans")
    print("-" * 60)

    # List all users
    print("\n--- REGISTERED USERS ---")
    users = list(users_col.find().sort("created_at", -1))
    if not users:
        print("  (No users found)")
    else:
        for idx, u in enumerate(users, 1):
            uid = str(u.get("_id"))
            name = u.get("name", "N/A")
            email = u.get("email", "N/A")
            created = u.get("created_at", "N/A")
            user_preds = pred_col.count_documents({"user_id": uid})
            print(f"  {idx}. {name} | {email}")
            print(f"     ID: {uid} | Registered: {created} | Scans: {user_preds}")

    # List recent 10 predictions
    print("\n--- RECENT 10 PREDICTIONS ---")
    preds = list(pred_col.find().sort("timestamp", -1).limit(10))
    if not preds:
        print("  (No predictions found)")
    else:
        for idx, p in enumerate(preds, 1):
            cls = p.get("predicted_class", "Unknown")
            conf = p.get("confidence", 0.0)
            ts = p.get("timestamp", "N/A")
            img = p.get("image_filename", "N/A")
            print(f"  {idx}. [{cls}] {conf * 100:.1f}% confidence | Time: {ts} | File: {img}")

    print("\n" + "=" * 60)
    print("Tip: You can also view and edit all records visually in MongoDB Compass!")
    print("=" * 60)

if __name__ == "__main__":
    main()
