# Robust Google OAuth + Password Login Flow Design

## 1. Sequence / Flow Description

### Backend
- `/api/auth/google` (GET): Initiates OAuth, sets state/nonce, redirects to Google.
- Google redirects to `/api/auth/google/callback?code=...&state=...`
- Backend:
  1. Validates state (CSRF).
  2. Exchanges code for tokens.
  3. Validates id_token (signature, aud, iss, exp, nonce).
  4. Extracts claims: sub (google_id), email, email_verified, name, picture.
  5. Decision tree:
     - If user with `google_id` exists: sign in, create session, redirect to app.
     - If user with `email` exists but no `google_id`: respond with "link required" (do NOT auto-link).
     - If no user: create pre-user session, redirect to `/complete-profile?token=...` with Google data.

### Frontend
- "Continue with Google" opens popup (fallback to redirect).
- On callback:
  - If success: refetch `/api/auth/user`, route to dashboard.
  - If "link required": show modal to confirm password or send verification email.
  - If "complete profile": show `/complete-profile` page, prefill with Google data, require required fields.
  - On error: show clear error message.

---

## 2. Backend Changes

### a. DB Schema
- Add `google_id` (string, unique, nullable) to users table.
- Add `profile_complete` (boolean, default false).
- Add `pre_user_tokens` table: { token, google_id, email, name, picture, expires_at }

### b. Endpoints
- `/api/auth/google` (GET): Start OAuth.
- `/api/auth/google/callback` (GET): Handle callback, return:
  - 200 + session if success
  - 409 + { type: "link_required", email } if email exists but not linked
  - 307 redirect to `/complete-profile?token=...` if new user
- `/api/auth/link-account` (POST): { email, password } → on success, link google_id, sign in.
- `/api/auth/complete-profile` (POST): { token, ...fields } → create user, sign in.

### c. Pseudocode
```js
// In google callback:
if (user with google_id) {
  signIn(user);
} else if (user with email && !user.google_id) {
  res.status(409).json({ type: "link_required", email });
} else {
  // create pre-user token/session
  savePreUserToken({ google_id, email, ... });
  res.redirect(`/complete-profile?token=...`);
}
```

---

## 3. Frontend Changes

- "Continue with Google" button: popup, spinner, error handling.
- `/complete-profile`: Form, prefilled, required fields, submit to `/api/auth/complete-profile`.
- "Link account" modal: password input, or "send verification email".
- Error handling for all flows (popup blocked, user cancel, backend errors).

---

## 4. Security Checklist

- Use state/nonce for CSRF and replay protection.
- Validate id_token signature, aud, iss, exp, nonce.
- Only link Google to existing account after password or email confirmation.
- Do not auto-create or auto-link on email match.
- Expire pre-user tokens after short time.
- Set secure, httpOnly cookies for session.
- Require email_verified from Google for account creation.

---

## 5. Acceptance Criteria & Tests

- [ ] Normal login works as before.
- [ ] Google login (existing user) signs in.
- [ ] Google login (new user) → complete profile → signs in.
- [ ] Google login (email exists, not linked) → link flow required.
- [ ] All error cases show clear messages.
- [ ] Security: state/nonce/id_token validated, no auto-linking, pre-user tokens expire.
- [ ] Analytics events fire for success/failure.

---

## 6. Analytics/Telemetry

- Track: Google login started, success, failure, popup blocked, user cancel, link required, complete profile started/completed, errors.

---

## TODO

- [ ] Update DB schema: add google_id, profile_complete, pre_user_tokens.
- [ ] Update backend: google callback, link-account, complete-profile endpoints.
- [ ] Update frontend: Google button, popup, error handling, complete-profile page, link modal.
- [ ] Add security: state/nonce, id_token validation, pre-user token expiry.
- [ ] Add analytics/telemetry.
- [ ] Write tests for all flows.
