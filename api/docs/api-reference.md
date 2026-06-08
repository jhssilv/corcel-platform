# API Reference

Complete reference for the Corcel Platform REST API. All endpoints are prefixed with `/api/` and served by the Flask backend.

> [!NOTE]
> Most endpoints require a valid JWT token in the request cookies. Endpoints that require authentication are marked with `login required` or `admin required`.

---

## Authentication

Source: [auth_routes.py](../app/routes/auth_routes.py)

### `POST /api/login`

Authenticates a user and sets a JWT cookie.

**Request**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success**
```json
{
  "message": "Login successful",
  "isAdmin": true
}
```

### `GET /api/logout`

Clears the JWT cookie.

### `GET /api/me`

Returns the current user profile.

**Success**
```json
{
  "username": "admin",
  "isAdmin": true
}
```

### `POST /api/register`

Admin-only account creation.

### `POST /api/activate`

Activates an inactive account and sets the password.

### `GET /api/users`

Returns all usernames.

### `GET /api/users/data`

Admin-only detailed user listing.

### `PATCH /api/users/<username>/status`

Admin-only explicit active/inactive toggle.

### `PATCH /api/users/<username>/role`

Admin-only explicit admin-role toggle.

---

## Texts

Source: [text_routes.py](../app/routes/text_routes.py)

### `GET /api/texts/`

Returns text metadata including the current user's normalization state.

### `GET /api/texts/filtered`

Returns filtered texts based on grades, assigned users, normalized state, and fuzzy filename search.

### `GET /api/texts/<text_id>`

Returns full text detail including tokens, suggestions, and flags.

### `GET /api/texts/status/batch`

Returns processing status for a list of text IDs and includes `missing_ids` for unknown IDs.

### `GET /api/text-upload-batches/<batch_id>`

Returns durable text-upload batch progress, counters, failed files, and current child-text state.

### `GET /api/text-upload-batches/active`

Returns active or recently finished text-upload batches for the current admin user.

---

## Raw Texts

### `GET /api/raw-texts/`

Returns metadata for all raw texts.

### `GET /api/raw-texts/<text_id>`

Returns the full content of one raw text.

### `PUT /api/raw-texts/<text_id>`

Updates the text content of a raw text.

### `POST /api/raw-texts/<text_id>/finalize`

Runs the synchronous raw-text finalization flow and creates a processed text.

---

## Normalizations

### `GET /api/texts/<text_id>/normalizations`

Returns the current user's normalizations for a text.

### `POST /api/texts/<text_id>/normalizations`

Creates or updates one normalization.

### `DELETE /api/texts/<text_id>/normalizations`

Deletes one normalization by token index.

### `DELETE /api/texts/<text_id>/normalizations/all`

Deletes all current-user normalizations for the text.

### `PATCH /api/texts/<text_id>/normalizations`

Toggles the current user's "normalization complete" state for the text.

---

## Tokens

### `PATCH /api/tokens/<token_id>/normalization-flag`

Sets the shared `to_be_normalized` flag for a token.

---

## Whitelist

### `GET /api/whitelist/`

Returns all whitelisted tokens.

### `POST /api/whitelist/`

Adds one token to the whitelist.

### `DELETE /api/whitelist/<token_text>`

Removes one token from the whitelist.

---

## Upload Jobs

Source: [upload_routes.py](../app/routes/upload_routes.py)

### `POST /api/upload`

Admin-only text archive upload. Saves the ZIP to the backend spool area, creates a durable upload batch, and creates a background job for archive import.

**Content-Type**: `multipart/form-data`

**Form Fields**

| Field | Type | Description |
|---|---|---|
| `file` | file | A `.zip` file containing `.txt` and/or `.docx` files |

**Success**
```json
{
  "job_id": "abc123-def456",
  "batch_id": 7
}
```

### `GET /api/status/<job_id>`

Polls the status of a background job stored in Postgres.

**Pending**
```json
{ "state": "PENDING", "status": "Waiting..." }
```

**Running**
```json
{ "state": "RUNNING", "status": "Processing file 3 of 10...", "current": 3, "total": 10 }
```

**Success**
```json
{
  "state": "SUCCESS",
  "status": "Finished",
  "result": {
    "kind": "text_upload",
    "batch_id": 7,
    "text_ids": [1, 2, 3],
    "created": 3,
    "failed_files": []
  },
  "failed_files": []
}
```

**Failure**
```json
{ "state": "FAILURE", "status": "Processing Failed", "error": "Error details..." }
```

---

## OCR

Source: [ocr_routes.py](../app/routes/ocr_routes.py)

### `POST /api/ocr/upload`

Admin-only OCR archive upload. Saves the ZIP to the backend spool area and creates a durable background job for OCR processing.

**Content-Type**: `multipart/form-data`

**Form Fields**

| Field | Type | Description |
|---|---|---|
| `file` | file | A `.zip` file containing images |

**Success**
```json
{
  "job_id": "abc123-def456"
}
```

### `GET /api/ocr/raw-texts/<text_id>/image`

Returns the original image associated with a raw OCR text.

---

## Downloads

Source: [download_routes.py](../app/routes/download_routes.py)

### `POST /api/report/`

Generates a CSV report for specified texts using the current user's normalizations.

### `POST /api/download/`

Downloads normalized texts as a ZIP file.

---

## Assignments

Source: [assignment_routes.py](../app/routes/assignment_routes.py)

### `POST /api/assignments/`

Bulk assigns texts to users with round-robin distribution.

### `DELETE /api/assignments/`

Removes text assignments from specified users.
