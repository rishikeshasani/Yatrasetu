import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from the .env file
load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError(
        "SUPABASE_URL or SUPABASE_KEY is missing from environment variables. "
        "Please check your backend/.env file."
    )

# Create and export the Supabase client
supabase = create_client(supabase_url, supabase_key)