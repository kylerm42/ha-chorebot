#!/usr/bin/env python3
"""
Diagnostic script to verify ChoreBot frontend resource registration.

Run this from Home Assistant's Python environment:
  docker exec -it homeassistant-chorebot-dev python3 /config/custom_components/chorebot/verify_registration.py

Or use HA's Developer Tools → Template:
  {{ integration_entities('chorebot') }}
"""

import sys
from pathlib import Path

def check_files():
    """Check if card files exist."""
    www_path = Path(__file__).parent / "www"
    print(f"Checking www directory: {www_path}")
    print(f"  Exists: {www_path.exists()}")
    print(f"  Is directory: {www_path.is_dir()}")
    
    if www_path.exists():
        js_files = list(www_path.glob("*.js"))
        print(f"  Found {len(js_files)} JS files:")
        for f in js_files:
            print(f"    - {f.name} ({f.stat().st_size} bytes)")
    else:
        print("  ❌ Directory does not exist!")
    
    return www_path.exists()

def check_integration_loaded():
    """Check if integration is loaded in Home Assistant."""
    # This would need HA's context to work
    print("\nTo check if integration is loaded, run in HA's Developer Tools → Template:")
    print('  {{ states("todo.chorebot_test") }}')
    print('  {{ integration_entities("chorebot") | list }}')

if __name__ == "__main__":
    print("=" * 60)
    print("ChoreBot Frontend Registration Diagnostic")
    print("=" * 60)
    
    if check_files():
        print("\n✅ Files check passed!")
    else:
        print("\n❌ Files check failed!")
        sys.exit(1)
    
    check_integration_loaded()
    
    print("\n" + "=" * 60)
    print("Next Steps:")
    print("=" * 60)
    print("1. Restart Home Assistant or reload ChoreBot integration")
    print("2. Check logs for: 'Successfully registered static path'")
    print("3. Go to Developer Tools → Info → 'Frontend' section")
    print("4. Check Settings → Dashboards → Resources")
    print("   (Note: add_extra_js_url registers modules, not dashboard resources)")
