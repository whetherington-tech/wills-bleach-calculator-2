# Will's Bleach Calculator - Deployment & HubSpot Integration Guide

## 🚀 Quick Deployment to Vercel (Recommended)

### Step 1: Prepare Your Repository
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js app
5. **BEFORE DEPLOYING**: Add environment variables

### Step 3: Configure Environment Variables
In Vercel dashboard, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

**Where to get these values:**
- **Supabase**: Project Dashboard → Settings → API
- **OpenAI**: https://platform.openai.com/api-keys

### Step 4: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Get your live URL: `your-project-name.vercel.app`

---

## 🎯 HubSpot Integration

### Method 1: Rich Text Module with iframe (Recommended)

1. **In HubSpot Page Editor:**
   - Add a "Rich Text" module to your page
   - Click the HTML source button `<>`
   - Paste this code (replace YOUR_URL with your Vercel URL):

```html
<!-- Will's Bleach Calculator Embed -->
<div style="width: 100%; max-width: 1200px; margin: 0 auto; padding: 20px 0;">
  <iframe
    src="https://YOUR_URL.vercel.app"
    width="100%"
    height="800px"
    frameborder="0"
    style="border: none; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);"
    loading="lazy"
    title="Will's Bleach Calculator">
  </iframe>
</div>
```

### Method 2: Full-Page Embed
For a dedicated calculator page:

```html
<!-- Full-page calculator embed -->
<div style="width: 100vw; height: 100vh; margin: 0; padding: 0; overflow: hidden;">
  <iframe
    src="https://YOUR_URL.vercel.app"
    width="100%"
    height="100%"
    frameborder="0"
    style="border: none; display: block;">
  </iframe>
</div>
```

### Method 3: Mobile-Optimized Embed
For better mobile experience:

```html
<!-- Responsive calculator embed -->
<div class="calculator-container" style="position: relative; width: 100%; min-height: 800px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; overflow: hidden;">
  <iframe
    src="https://YOUR_URL.vercel.app"
    width="100%"
    height="100%"
    frameborder="0"
    style="border: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
  </iframe>
</div>

<style>
@media (max-width: 768px) {
  .calculator-container {
    min-height: 1000px;
  }
}
</style>
```

---

## 🔧 Custom Domain Setup (Optional)

### Option 1: Vercel Custom Domain
1. In Vercel dashboard → Domains
2. Add your domain: `calculator.willsfriends.com`
3. Follow DNS instructions

### Option 2: CNAME Setup
1. Add CNAME record in your DNS:
   ```
   calculator → your-project-name.vercel.app
   ```

---

## 📊 Analytics & Tracking

### Add HubSpot Tracking
Add this to your HubSpot page template (not in the iframe):

```html
<!-- HubSpot tracking for calculator page -->
<script>
// Track calculator page views
gtag('event', 'page_view', {
  page_title: 'Will\'s Bleach Calculator',
  page_location: window.location.href
});

// Track when calculator loads
window.addEventListener('message', function(event) {
  if (event.data === 'calculator_loaded') {
    gtag('event', 'calculator_interaction', {
      event_category: 'Calculator',
      event_label: 'Calculator Loaded'
    });
  }
});
</script>
```

---

## 🔒 Security Checklist

- ✅ HTTPS enabled (automatic with Vercel)
- ✅ Environment variables secured
- ✅ X-Frame-Options configured
- ✅ No API keys exposed in frontend

---

## 🛠 Troubleshooting

### Calculator Not Loading
1. Check browser console for errors
2. Verify environment variables in Vercel
3. Check Supabase connection status

### Mobile Issues
1. Increase iframe height to 1000px for mobile
2. Test on different devices
3. Consider using responsive CSS

### HubSpot Integration Issues
1. Ensure iframe URL is correct
2. Check for CSP (Content Security Policy) blocks
3. Test in HubSpot preview mode

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console errors
3. Verify all environment variables are set correctly

---

## 🎉 You're Live!

Your calculator is now live and ready for users. Test the full flow:
1. Enter zip code
2. Select utility
3. Enter usage data
4. View results
5. Test CTA button functionality

**Your calculator URL:** `https://your-project-name.vercel.app`