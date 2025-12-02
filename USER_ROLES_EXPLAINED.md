# 👥 User Roles Explained: Founder vs Admin

## 🔑 Admin Users

**Who are Admins?**
- Users with `is_admin = true` in the `profiles` table, **OR**
- Users with email `admin@unifr.com`

**How to Make Someone an Admin:**
```sql
-- Set a user as admin (replace with their email)
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

**Admin Privileges:**
- ✅ Access to admin pages (`/admin/waitlist`, `/admin/users`, `/admin/founders-note`)
- ✅ Can publish blog posts (`/admin/publish-blog`)
- ✅ Can view all users in the system
- ✅ Can create founder notes for users
- ✅ Can view waitlist entries
- ✅ Can manage all system data

**Admin Check in Code:**
```typescript
const isAdmin = profile?.is_admin === true || profile?.email === "admin@unifr.com";
```

---

## 🎯 Founder Users

**Who are Founders?**
- Users who have an active subscription with `is_founder = true` in the `subscriptions` table
- This is set automatically when they subscribe to a "Founder Circle" plan:
  - **Basic Founder** ($49/month) - has `is_founder = true`
  - **Basic Normal** ($99/month) - has `is_founder = false`
  - **Pro Founder** - has `is_founder = true`
  - **Pro Normal** - has `is_founder = false`

**How Founder Status is Set:**
- Automatically set by Razorpay subscription plan
- Stored in `subscriptions.is_founder` column
- Checked via `getUserSubscriptionLimits()` function

**Founder Benefits:**
- ✅ **50% discount** on subscription ($49 vs $99 for Basic)
- ✅ **Skip onboarding** - go straight to dashboard
- ✅ Same features as regular subscribers, just cheaper pricing
- ✅ Early adopter status

**Founder Check in Code:**
```typescript
const subscriptionLimits = await getUserSubscriptionLimits(userId);
const isFounder = subscriptionLimits.isFounder === true;
```

---

## 📊 Key Differences

| Feature | Admin | Founder |
|---------|-------|---------|
| **How Set** | Manual SQL update (`is_admin = true`) | Automatic (via subscription plan) |
| **Database** | `profiles.is_admin` column | `subscriptions.is_founder` column |
| **Pricing** | No discount | 50% discount ($49 vs $99) |
| **Onboarding** | Must complete (if not founder) | **Skipped automatically** |
| **Admin Access** | ✅ Yes | ❌ No |
| **Blog Publishing** | ✅ Yes | ❌ No |
| **User Management** | ✅ Yes | ❌ No |

---

## 🔍 How to Check User Roles

### Check if User is Admin:
```sql
SELECT id, email, is_admin 
FROM profiles 
WHERE email = 'user@example.com';
```

### Check if User is Founder:
```sql
SELECT s.id, s.user_id, s.is_founder, s.plan_type, s.status, p.email
FROM subscriptions s
JOIN profiles p ON s.user_id = p.id
WHERE p.email = 'user@example.com'
AND s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 1;
```

### Check Both:
```sql
SELECT 
  p.id,
  p.email,
  p.is_admin as is_admin_user,
  s.is_founder as is_founder_subscriber,
  s.plan_type,
  s.status as subscription_status
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
WHERE p.email = 'user@example.com';
```

---

## 💡 Common Scenarios

### Scenario 1: You Want to Be Admin
```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### Scenario 2: Make Someone a Founder (Manual Override)
```sql
-- Update their subscription to founder
UPDATE public.subscriptions 
SET is_founder = true 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com')
AND status = 'active';
```

### Scenario 3: Check Your Own Status
```sql
-- Check if you're admin
SELECT is_admin FROM profiles WHERE id = auth.uid();

-- Check if you're founder
SELECT is_founder FROM subscriptions 
WHERE user_id = auth.uid() AND status = 'active';
```

---

## ⚠️ Important Notes

1. **Admin ≠ Founder**: These are separate roles
   - You can be admin but not founder
   - You can be founder but not admin
   - You can be both admin AND founder

2. **Founder Status**: Automatically set based on subscription plan
   - Don't manually change `is_founder` unless you know what you're doing
   - It's tied to the Razorpay subscription plan

3. **Admin Status**: Manually set
   - Only you (the developer) should set admin status
   - Use SQL to grant admin access

4. **Onboarding Skip**: Only founders skip onboarding
   - Admins still need to complete onboarding (unless they're also founders)
   - This was recently fixed in the code

---

## 🎯 Summary

- **Admin** = System administrator (you) - can manage everything
- **Founder** = Early adopter with discount - skips onboarding, gets 50% off

You (the website owner) should be **both admin AND founder** to have full control and skip onboarding!

