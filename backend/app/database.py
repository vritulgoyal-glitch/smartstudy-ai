from supabase import create_client, Client
from app.config import settings


def get_supabase() -> Client:
    """Return a Supabase client using the anon key (for user-scoped queries)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_supabase_admin() -> Client:
    """Return a Supabase client using the service role key (admin)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


supabase: Client = get_supabase()
supabase_admin: Client = get_supabase_admin()
