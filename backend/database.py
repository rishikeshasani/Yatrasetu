import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

class DummyTable:
    def __init__(self, name):
        self.name = name
    def select(self, *args, **kwargs):
        return self
    def insert(self, *args, **kwargs):
        return self
    def eq(self, *args, **kwargs):
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

if not supabase_url or not supabase_key:
    print("[!] SUPABASE_URL / SUPABASE_KEY not found in .env. Running with local fallback client.")
    supabase = DummySupabase()
else:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"[!] Supabase connection warning: {e}. Using fallback client.")
        supabase = DummySupabase()
