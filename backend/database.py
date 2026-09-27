import os
from dotenv import load_dotenv
try:
    from supabase import create_client
except ImportError:
    create_client = None  # type: ignore

# Load from backend/.env, backend/.env.example, and current working directory
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_backend_env = os.path.join(_backend_dir, ".env")
_backend_example = os.path.join(_backend_dir, ".env.example")

if os.path.exists(_backend_env):
    load_dotenv(_backend_env)
elif os.path.exists(_backend_example):
    load_dotenv(_backend_example)
load_dotenv()

# Fallbacks to canonical project configuration if not present in env
DEFAULT_SUPABASE_URL = "https://pexmnvicqyturozigmge.supabase.co"
DEFAULT_SUPABASE_KEY = "sb_publishable_P5mhf2mfTfngmq7FSeMLQg_l_4Z1w7N"

supabase_url = os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL
supabase_key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or DEFAULT_SUPABASE_KEY
supabase_service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
if supabase_key and not os.environ.get("SUPABASE_ANON_KEY"):
    os.environ["SUPABASE_ANON_KEY"] = supabase_key

class DummyTable:
    def __init__(self, name):
        self.name = name
    def select(self, *args, **kwargs):
        return self
    def insert(self, records, *args, **kwargs):
        # Simulate insertion and return the inserted records.
        # 'records' is expected to be a list of dicts.
        # Ensure each record has an 'id' field.
        inserted = []
        for rec in records:
            if isinstance(rec, dict):
                rec = rec.copy()
                if 'id' not in rec:
                    # generate a simple UUID-like string
                    import uuid
                    rec['id'] = str(uuid.uuid4())
                inserted.append(rec)
        class DummyData:
            data = inserted
        return DummyData()
    def eq(self, *args, **kwargs):
        return self
    def in_(self, *args, **kwargs):
        return self
    def gte(self, *args, **kwargs):
        return self
    def lte(self, *args, **kwargs):
        return self
    def order(self, *args, **kwargs):
        return self
    def limit(self, *args, **kwargs):
        return self
    def execute(self):
        class DummyData:
            data = []
        return DummyData()

class DummySupabase:
    def table(self, name):
        return DummyTable(name)

# 1. Standard client using anon/publishable key for normal public/auth operations
if not supabase_url or not supabase_key:
    print("[!] SUPABASE_URL / SUPABASE_KEY not found in .env. Running with local fallback client.")
    supabase = DummySupabase()
else:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"[!] Supabase connection warning: {e}. Using fallback client.")
        supabase = DummySupabase()

# 2. Server-side admin client using service_role key for trusted backend operations
# Note: SUPABASE_SERVICE_ROLE_KEY is strictly backend-only and never exposed to the frontend
if supabase_service_role_key and supabase_url:
    try:
        supabase_admin = create_client(supabase_url, supabase_service_role_key)
    except Exception as e:
        print(f"[!] Supabase admin client initialization warning: {e}. Falling back to standard client.")
        supabase_admin = supabase
else:
    # Falls back to standard client if service role key not provided
    supabase_admin = supabase

