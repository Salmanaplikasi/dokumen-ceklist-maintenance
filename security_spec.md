# Firestore Security Specification — Checklist PM & FieldDoc

## 1. Data Invariants
1. All operations deny by default (`match /{document=**} { allow read, write: if false; }`).
2. Standard reads and writes require an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`).
3. Every `FieldDocReport` (`fielddoc_reports/{reportId}`) must have a valid ID (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars), immutable `ownerUid == request.auth.uid` on creation, bounded strings (`title`, `org`, `site`, `wmLoc`, `wmGps`, `author`, `roleLabel`), bounded counts (`slotCount`, `filledCount`), and server-verified `createdAt == request.time` / `updatedAt == request.time`.
4. Every `FieldDocSlot` (`fielddoc_reports/{reportId}/slots/{slotId}`) is gated via Master Gate `get(/databases/$(database)/documents/fielddoc_reports/$(reportId))` on create/update/delete/get, strictly verifies `reportId` matches parent path and `ownerUid` matches parent `ownerUid`, and caps `img <= 450000` bytes and `desc <= 4000` chars.
5. List queries on `fielddoc_reports` and `slots` enforce `resource.data.visibility == 'team' || resource.data.ownerUid == request.auth.uid || isAdmin()` without calling `get()` or `exists()` inside `allow list`.
6. User PII (`email`) is isolated to `/users/{userId}/private/{docId}` and readable/writable only by `request.auth.uid == userId` or `isAdmin()`. Shared reports contain only non-PII `author` and `roleLabel`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Create**: Creating `/fielddoc_reports/rep_1` with `request.auth == null`.
2. **Unverified Email Spoof**: Creating or deleting as a user with `email_verified: false` claiming admin email.
3. **Owner Spoofing**: Creating `/fielddoc_reports/rep_2` with `ownerUid: "other_uid"` != `request.auth.uid`.
4. **Ghost / Shadow Field Injection**: Creating `/fielddoc_reports/rep_3` with an extra field `{ isAdmin: true }`.
5. **Path ID Poisoning**: Creating `/fielddoc_reports/../../etc/passwd` or a 200-char report ID.
6. **Client-Forged Timestamp**: Creating `/fielddoc_reports/rep_4` with `createdAt` != `request.time`.
7. **Immortal Field Tampering**: Updating `ownerUid` or `createdAt` or `id` on an existing `/fielddoc_reports/rep_1`.
8. **Oversized Photo / Denial of Wallet**: Creating a slot doc with `img` > `450000` chars or `desc` > `4000` chars.
9. **Orphan Slot Creation**: Creating `/fielddoc_reports/nonexistent_report/slots/slot_0` when parent doc does not exist.
10. **Cross-Tenant Private Read**: Reading a report with `visibility == 'private'` owned by another user.
11. **Unauthorized Delete**: Deleting `/fielddoc_reports/rep_1` when `request.auth.uid != resource.data.ownerUid` and not admin.
12. **PII Cross-User Access**: Reading `/users/victim_uid/private/profile` as `attacker_uid`.
