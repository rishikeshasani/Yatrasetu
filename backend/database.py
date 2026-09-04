import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from the .env file
load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase_service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError(
        "SUPABASE_URL or SUPABASE_KEY is missing from environment variables. "
        "Please check your backend/.env file."
    )

# Standard client using anon/publishable key for client-facing/auth operations
supabase = create_client(supabase_url, supabase_key)

# Separate server-side admin client using service_role key for trusted backend operations
# Note: SUPABASE_SERVICE_ROLE_KEY is strictly backend-only and never exposed to the frontend
if supabase_service_role_key:
    supabase_admin = create_client(supabase_url, supabase_service_role_key)
else:
    # Falls back to standard client if service role key not provided
    supabase_admin = supabase