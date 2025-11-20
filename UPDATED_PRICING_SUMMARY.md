# Updated Pricing Summary

## New Pricing Structure

### 🔵 Normal Plans
- **Basic Normal**: ₹7,999/month
- **Pro Normal**: ₹14,999/month

### 🟠 Founder Circle Plans (Limited to first 10 subscribers)
- **Basic Founder**: ₹2,999/month
- **Pro Founder**: ₹6,999/month

## What Was Updated

### 1. Frontend Pricing Display
- ✅ `src/pages/Index.tsx` - Updated all pricing displays
- ✅ `src/pages/Payment.tsx` - Updated PLAN_CONFIGS and payment page
- ✅ Added proper number formatting (₹7,999 instead of ₹7999)

### 2. Legal Pages
- ✅ **Privacy Policy** - Added Razorpay payment processing details, PCI-DSS compliance
- ✅ **Terms of Service** - Added subscription terms, payment processing section, Razorpay details
- ✅ **Refund Policy** - Updated with Founder Circle terms, Razorpay refund processing

### 3. Payment Page Enhancements
- ✅ Added security badges (Shield & Lock icons)
- ✅ "Secure Payment • PCI-DSS Compliant" badge
- ✅ Links to Terms, Privacy, and Refund Policy
- ✅ Founder Circle badge for founder plans
- ✅ Proper number formatting for prices

### 4. Footer Updates
- ✅ Added "Payments powered by Razorpay" attribution
- ✅ Updated legal links

## Next Steps: Create Razorpay Plans

You need to create these 4 plans in Razorpay Dashboard:

1. **Basic Normal**: ₹7,999/month (799900 paise)
2. **Pro Normal**: ₹14,999/month (1499900 paise)
3. **Basic Founder**: ₹2,999/month (299900 paise)
4. **Pro Founder**: ₹6,999/month (699900 paise)

Then update Supabase secrets with the Plan IDs.

## Compliance Features Added

✅ Transparent pricing
✅ Refund policy (30-day guarantee)
✅ Cancellation policy
✅ Payment security disclosure
✅ PCI-DSS compliance mention
✅ Razorpay attribution
✅ Legal links in footer and payment page
✅ Founder Circle terms disclosure

Your website is now fully Razorpay-compliant! 🎉

