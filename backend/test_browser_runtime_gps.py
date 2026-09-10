import json
import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
from playwright.sync_api import sync_playwright

CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe"
BASE_URL = "http://localhost:5173"

def setup_tourist_session(page):
    page.add_init_script("""
        localStorage.setItem("yatrasetu_user", JSON.stringify({
            id: "test-tourist-user-001",
            full_name: "Yatri Devotee",
            role: "tourist",
            email: "tourist@yatrasetu.org"
        }));
    """)

def run_browser_verification():
    print("==================================================================")
    print(">>> STARTING BROWSER RUNTIME VERIFICATION <<<")
    print("==================================================================")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True
        )

        # --------------------------------------------------------------------
        # TEST 1: Initial State (Before Scanning)
        # --------------------------------------------------------------------
        print("\n--- Test 1: Verifying Initial State Before Scanning ---")
        context1 = browser.new_context()
        page1 = context1.new_page()
        setup_tourist_session(page1)
        page1.goto(BASE_URL, wait_until="domcontentloaded")

        scanner = page1.locator(".geofence-scanner-card")
        scanner.wait_for(state="visible", timeout=10000)
        scanner.scroll_into_view_if_needed()

        initial_box = scanner.locator(".scan-result-box")
        initial_text = initial_box.inner_text()
        print(f"Observed initial box text:\n{initial_text}")

        assert "Location not scanned" in initial_text, "Expected 'Location not scanned' in initial box"
        assert "Safe Green Zone" not in initial_text, "ERROR: Initial box incorrectly shows 'Safe Green Zone'!"
        print("PASS: Initial state displays 'Location not scanned' and NOT 'Safe Green Zone'")
        results["initial_state"] = "PASS"
        context1.close()

        # --------------------------------------------------------------------
        # TEST 2: Native Browser Execution without GPS Hardware (Timeout / Unavailable)
        # --------------------------------------------------------------------
        print("\n--- Test 2: Native Hardware GPS Query on this PC (Expect Timeout/Unavailable) ---")
        context_native = browser.new_context(permissions=["geolocation"])
        page_native = context_native.new_page()
        setup_tourist_session(page_native)
        page_native.goto(BASE_URL, wait_until="domcontentloaded")

        scanner_native = page_native.locator(".geofence-scanner-card")
        scanner_native.wait_for(state="visible", timeout=10000)
        scanner_native.scroll_into_view_if_needed()

        btn_native = scanner_native.locator(".geofence-scan-btn")
        btn_native.click()

        # Wait for loading state
        print("Waiting for native GPS acquisition attempt to conclude...")
        page_native.wait_for_selector(".scan-result-box.error-zone", timeout=15000)
        native_error_text = scanner_native.locator(".scan-result-box.error-zone").inner_text()
        print(f"Observed native GPS hardware error text:\n{native_error_text}")

        assert ("Location request timed out" in native_error_text or "Location unavailable" in native_error_text)
        assert "Safe Green Zone" not in native_error_text, "ERROR: GPS hardware failure converted to Safe!"
        print("PASS: Native environment without physical GPS cleanly transitions to Timeout/Unavailable error and NOT Safe")
        results["native_gps_timeout_handling"] = "PASS"
        context_native.close()

        # --------------------------------------------------------------------
        # TEST 3: Permission Denial Handling
        # --------------------------------------------------------------------
        print("\n--- Test 3: Permission Denial Handling ---")
        context_denied = browser.new_context(permissions=[])
        page_denied = context_denied.new_page()
        setup_tourist_session(page_denied)

        # Emulate browser permission denied (code 1)
        page_denied.add_init_script("""
            navigator.geolocation.getCurrentPosition = function(success, error, options) {
                setTimeout(function() {
                    var err = new Error("User denied Geolocation");
                    err.code = 1;
                    err.PERMISSION_DENIED = 1;
                    error(err);
                }, 50);
            };
        """)

        page_denied.goto(BASE_URL, wait_until="domcontentloaded")
        scanner_denied = page_denied.locator(".geofence-scanner-card")
        scanner_denied.wait_for(state="visible", timeout=10000)
        scanner_denied.scroll_into_view_if_needed()

        scanner_denied.locator(".geofence-scan-btn").click()
        page_denied.wait_for_selector(".scan-result-box.error-zone", timeout=5000)

        denied_text = scanner_denied.locator(".scan-result-box.error-zone").inner_text()
        print(f"Observed permission denial text:\n{denied_text}")
        assert "Location permission denied" in denied_text
        assert "Safe Green Zone" not in denied_text
        assert "Try Again" in scanner_denied.locator(".geofence-scan-btn").inner_text()
        print("PASS: Permission denial displays 'Location permission denied' with 'Try Again' and NOT Safe")
        results["permission_denial"] = "PASS"
        context_denied.close()

        # --------------------------------------------------------------------
        # TEST 4: Browser DevTools Geolocation Pipeline (End-to-End Data Path)
        # --------------------------------------------------------------------
        print("\n--- Test 4: End-to-End Data Path Verification (Browser -> API -> Backend -> UI) ---")
        test_coords = {
            "latitude": 17.38504,
            "longitude": 78.48667,
            "accuracy": 22
        }

        context_pipeline = browser.new_context(
            permissions=["geolocation"],
            geolocation=test_coords
        )
        page_pipeline = context_pipeline.new_page()
        setup_tourist_session(page_pipeline)

        console_logs = []
        page_pipeline.on("console", lambda msg: console_logs.append(msg.text))

        captured_requests = []
        captured_responses = []

        def on_req(req):
            if "/check-safety" in req.url:
                captured_requests.append(req.post_data)

        def on_res(res):
            if "/check-safety" in res.url:
                try:
                    captured_responses.append(res.json())
                except Exception:
                    pass

        page_pipeline.on("request", on_req)
        page_pipeline.on("response", on_res)

        page_pipeline.goto(BASE_URL, wait_until="domcontentloaded")
        scanner_pipeline = page_pipeline.locator(".geofence-scanner-card")
        scanner_pipeline.wait_for(state="visible", timeout=10000)
        scanner_pipeline.scroll_into_view_if_needed()

        print("Clicking 'Scan My Current GPS Zone'...")
        scanner_pipeline.locator(".geofence-scan-btn").click()

        try:
            page_pipeline.wait_for_function("""
                () => {
                    const box = document.querySelector('.geofence-scanner-card .scan-result-box');
                    return box && !box.classList.contains('unscanned');
                }
            """, timeout=12000)
        except Exception as e:
            print("wait_for_function error:", e)
            print("Current console logs:")
            for l in console_logs:
                print("  ", l)
            box_el = scanner_pipeline.locator(".scan-result-box")
            print("Current box text:", box_el.inner_text() if box_el.count() > 0 else "NO BOX")
            raise e

        # Verify console log
        print("Captured Browser Console Output:")
        for log in console_logs:
            if "GPS acquired:" in log:
                print("  ", log)

        # Verify Network Payload
        assert len(captured_requests) > 0, "No network request to /check-safety"
        req_body = json.loads(captured_requests[0])
        print("Captured /check-safety Request Payload:", json.dumps(req_body, indent=2))
        assert req_body["latitude"] == test_coords["latitude"]
        assert req_body["longitude"] == test_coords["longitude"]
        assert req_body["accuracy"] == test_coords["accuracy"]
        print("PASS: Request payload matches exact coordinates from browser geolocation callback")

        # Verify Backend Response
        assert len(captured_responses) > 0, "No response from /check-safety"
        res_body = captured_responses[0]
        print("Captured /check-safety Response:", json.dumps(res_body, indent=2))
        assert res_body["status"] == "SAFE"
        assert res_body["in_danger_zone"] is False

        # Verify UI Status & Accuracy
        ui_text = scanner_pipeline.locator(".scan-result-box").inner_text()
        print(f"Displayed UI Status:\n{ui_text}")
        assert "Safe Green Zone" in ui_text
        assert "Last checked: Just now" in ui_text
        assert f"±{test_coords['accuracy']} m" in ui_text
        print("PASS: UI correctly reflects backend SAFE status with timestamp and accuracy")
        results["pipeline_verification"] = "PASS"

        # --------------------------------------------------------------------
        # TEST 5: Rescan Fresh Acquisition
        # --------------------------------------------------------------------
        print("\n--- Test 5: Testing Rescan (Second Click) ---")
        time.sleep(1)
        scanner_pipeline.locator(".geofence-scan-btn").click()
        page_pipeline.wait_for_timeout(1000)
        assert len(captured_requests) >= 2, "Expected second request to /check-safety on re-scan"
        print(f"PASS: Rescan successfully initiated fresh request (total calls: {len(captured_requests)})")
        results["rescan"] = "PASS"
        context_pipeline.close()

        # --------------------------------------------------------------------
        # TEST 6: Backend Failure Handling (Never display Safe on 500)
        # --------------------------------------------------------------------
        print("\n--- Test 6: Backend Failure Handling (HTTP 500) ---")
        context_fail = browser.new_context(
            permissions=["geolocation"],
            geolocation=test_coords
        )
        page_fail = context_fail.new_page()
        setup_tourist_session(page_fail)

        page_fail.route("**/check-safety", lambda route: route.fulfill(
            status=500,
            content_type="application/json",
            body=json.dumps({"detail": "Internal Server Error"})
        ))

        page_fail.goto(BASE_URL, wait_until="domcontentloaded")
        scanner_fail = page_fail.locator(".geofence-scanner-card")
        scanner_fail.wait_for(state="visible", timeout=10000)
        scanner_fail.scroll_into_view_if_needed()
        scanner_fail.locator(".geofence-scan-btn").click()

        page_fail.wait_for_selector(".scan-result-box.error-zone", timeout=5000)
        fail_text = scanner_fail.locator(".scan-result-box.error-zone").inner_text()
        print(f"Observed backend failure text:\n{fail_text}")
        assert "Unable to evaluate your current location" in fail_text
        assert "Safe Green Zone" not in fail_text
        print("PASS: Backend failure cleanly displays error and NOT Safe")
        results["backend_failure"] = "PASS"
        context_fail.close()

        browser.close()

    print("\n==================================================================")
    print(">>> ALL BROWSER RUNTIME TESTS COMPLETED SUCCESSFULLY! <<<")
    print("==================================================================")

if __name__ == "__main__":
    run_browser_verification()
