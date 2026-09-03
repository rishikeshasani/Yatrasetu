"""
YatraSetu Crowd Data Integration Script
---------------------------------------
This script reads the crowd detection pipeline's output JSON file,
validates the fields, maps "person_count" to "people_count", validates
that the site_id exists in the database, and sends the records to the
FastAPI backend.

Supports:
1. Bulk upload (as fast as possible)
2. Simulation mode (sends each record with a configurable delay)
"""

import json
import time
import argparse
import urllib.request
import urllib.error

DEFAULT_API_URL = "http://127.0.0.1:8000"
DEFAULT_JSON_FILE = "crowd_data_for_backend.json"

def fetch_valid_sites(api_url):
    """Fetch the list of valid sites from the FastAPI backend."""
    url = f"{api_url.rstrip('/')}/sites"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "YatraSetu-Uploader"})
        with urllib.request.urlopen(req, timeout=5) as response:
            sites = json.loads(response.read().decode())
            return [site["id"] for site in sites]
    except urllib.error.URLError as e:
        print(f"Error connecting to backend at {url}: {e}")
        print("Please make sure your FastAPI backend server is running.")
        return None
    except Exception as e:
        print(f"Unexpected error fetching sites: {e}")
        return None

def send_record(api_url, record):
    """Send a single crowd observation record to the FastAPI backend."""
    url = f"{api_url.rstrip('/')}/crowd/update"
    data = json.dumps(record).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "YatraSetu-Uploader"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode())
            return True, res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        return False, f"HTTP Error {e.code}: {error_msg}"
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="Upload YatraSetu Crowd Detection data to backend")
    parser.add_argument("--file", default=DEFAULT_JSON_FILE, help="Path to crowd_data_for_backend.json")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="FastAPI backend base URL")
    parser.add_argument("--delay", type=float, default=0.0, help="Delay in seconds between records (simulation mode)")
    parser.add_argument("--skip-validation", action="store_true", help="Skip checking if site_id exists in database")
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of records to upload")
    args = parser.parse_args()

    # 1. Load JSON file
    try:
        with open(args.file, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{args.file}' not found.")
        return
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from '{args.file}': {e}")
        return

    if not isinstance(data, list):
        print("Error: JSON content must be a list of records.")
        return

    if args.limit is not None and args.limit > 0:
        data = data[:args.limit]

    print(f"Loaded {len(data)} records from '{args.file}'.")

    # 2. Fetch and Validate Site IDs
    if not args.skip_validation:
        print("Fetching valid site IDs from backend for validation...")
        valid_site_ids = fetch_valid_sites(args.api_url)
        if valid_site_ids is None:
            print("Validation failed: Could not retrieve valid sites from the backend.")
            print("To skip this check, run with --skip-validation (not recommended).")
            return
        print(f"Valid site IDs found in database: {valid_site_ids}")
    else:
        valid_site_ids = []

    # 3. Process, validate, and send records
    success_count = 0
    failure_count = 0

    print("\nStarting upload...")
    if args.delay > 0:
        print(f"Simulation Mode: Active with {args.delay}s delay between records.\n")

    for i, entry in enumerate(data):
        # Extract and validate site_id
        site_id = entry.get("site_id")
        if not site_id:
            print(f"Record {i} skipped: Missing 'site_id'.")
            failure_count += 1
            continue

        if not args.skip_validation and site_id not in valid_site_ids:
            print(f"Record {i} skipped: 'site_id' '{site_id}' does not match any site in Supabase.")
            failure_count += 1
            continue

        # Extract and normalize person_count to people_count
        people_count = entry.get("people_count")
        if people_count is None:
            people_count = entry.get("person_count")
        
        if people_count is None:
            print(f"Record {i} skipped: Missing 'people_count' or 'person_count'.")
            failure_count += 1
            continue

        # Extract other optional fields
        queue_length = entry.get("queue_length", 0)
        timestamp = entry.get("timestamp")

        # Construct payload for API
        payload = {
            "site_id": site_id,
            "people_count": int(people_count),
            "queue_length": int(queue_length)
        }
        if timestamp:
            payload["timestamp"] = timestamp

        # Send request
        success, response_or_error = send_record(args.api_url, payload)
        if success:
            success_count += 1
            print(f"[{i+1}/{len(data)}] Uploaded - Site: {site_id}, People: {people_count}, Time: {timestamp} -> Success!")
        else:
            failure_count += 1
            print(f"[{i+1}/{len(data)}] Failed to upload - Site: {site_id} -> Error: {response_or_error}")

        # If simulation mode is active, sleep
        if args.delay > 0 and i < len(data) - 1:
            time.sleep(args.delay)

    print(f"\nUpload complete! Status:")
    print(f"  Success: {success_count}")
    print(f"  Failure: {failure_count}")

if __name__ == "__main__":
    main()
