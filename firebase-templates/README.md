# Firebase Email Templates

Use these HTML templates in **Firebase Console → Authentication → Templates**.

## File mapping

- `verify-email.html` → **Email address verification** (`VERIFY_EMAIL`)
- `password-reset.html` → **Password reset** (`RESET_PASSWORD`)
- `recover-email.html` → **Email address change revocation** (`RECOVER_EMAIL`)
- `email-link-signin.html` → **Email link sign-in** (`EMAIL_SIGNIN`)
- `verify-before-change-email.html` → **Verify and change email** (`VERIFY_AND_CHANGE_EMAIL`)

## Supported placeholders used

- `%LINK%` (required)
- `%APP_NAME%`
- `%EMAIL%`
