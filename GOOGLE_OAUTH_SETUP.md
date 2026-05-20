# Google OAuth Setup Guide for PrepVerse

## 🚀 Quick Setup (5 minutes)

### Step 1: Google Cloud Console Setup

1. **Go to**: https://console.cloud.google.com/
2. **Create/Select Project**: 
   - Click "Select a project" → "New Project"
   - Name: "PrepVerse" → Create
3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search "Google+ API" → Enable
4. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: External → Create
     - App name: "PrepVerse"
     - User support email: [YOUR_EMAIL]
     - Developer contact: [YOUR_EMAIL]
     - Save and Continue through all steps
   - Application type: "Web application"
   - Name: "PrepVerse Web Client"
   - Authorized redirect URIs: 
     ```
     https://frztnflswxgqadmcrmum.supabase.co/auth/v1/callback
     ```
   - Click "Create"
   - **COPY** Client ID and Client Secret

### Step 2: Supabase Configuration

1. **Go to**: https://supabase.com/dashboard/project/frztnflswxgqadmcrmum/auth/providers
2. **Find Google Provider** → Click to expand
3. **Enable**: Toggle "Enable sign in with Google" to ON
4. **Add Credentials**:
   - Client ID: [PASTE FROM STEP 1]
   - Client Secret: [PASTE FROM STEP 1]
5. **Site URL**: https://[YOUR-VERCEL-APP].vercel.app
6. **Redirect URLs**: https://[YOUR-VERCEL-APP].vercel.app/dashboard
7. **Click "Save"**

### Step 3: Re-enable Google Login Button

After completing steps 1-2, uncomment the Google login button in `src/pages/LoginPage.tsx`

### Step 4: Test

1. Deploy to Vercel
2. Try Google login
3. Should redirect to Google consent screen

## 🔧 Troubleshooting

**"Page inaccessible"**: OAuth not configured in Supabase
**"redirect_uri_mismatch"**: Check redirect URI in Google Console
**"Access blocked"**: Configure OAuth consent screen properly

## 📞 Need Help?

If you get stuck, share the specific error message and I can help debug!