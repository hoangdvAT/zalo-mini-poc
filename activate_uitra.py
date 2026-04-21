#!/usr/bin/env python3

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path


def generate_license_key(email: str, tier: str = "pro") -> str:
    """Generate deterministic license key from email."""
    hash_input = f"{email}-{tier}-agencyos"
    hash_suffix = hashlib.sha256(hash_input.encode()).hexdigest()[:8].upper()
    return f"AGENCYOS-{tier.upper()}-{hash_suffix}"


def activate_uitra(email: str) -> dict:
    license_dir = Path.home() / ".mekong"
    license_file = license_dir / "license.json"

    # tạo folder nếu chưa có
    license_dir.mkdir(parents=True, exist_ok=True)

    license_key = generate_license_key(email, "pro")

    license_data = {
        "key": license_key,
        "tier": "pro",
        "email": email,
        "activated_at": datetime.now().isoformat(),
        "status": "active",
        "features": {
            "monthly_api_calls": 10000,
            "monthly_commands": 500,
            "team_members": 5,
            "api_access": True,
            "priority_support": True,
            "max_daily_video": 10,
        },
    }

    with open(license_file, "w", encoding="utf-8") as f:
        json.dump(license_data, f, indent=2)

    return license_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 activate_uitra.py <email>")
        sys.exit(1)

    email = sys.argv[1]

    print(f"🏯 Activating UItra (PRO) license for: {email}")
    print("=" * 50)

    result = activate_uitra(email)

    print("✅ License activated!")
    print(f"Key: {result['key']}")
    print(f"Tier: {result['tier']}")
    print(f"Email: {result['email']}")
    print(f"Status: {result['status']}")


if __name__ == "__main__":
    main()
