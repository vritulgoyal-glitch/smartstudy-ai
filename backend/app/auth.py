from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {
            "user_id": user_response.user.id,
            "email": user_response.user.email,
            "token": token,
        }

    except Exception as e:
        print("AUTH ERROR:", str(e))
        raise HTTPException(status_code=401, detail=str(e))

def get_current_user(user=Depends(verify_token)):
    return user