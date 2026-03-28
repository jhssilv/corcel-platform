# API Reference

Complete reference for all REST API endpoints exposed by the Corcel Platform backend. All endpoints are prefixed with `/api/` and served on port `5000`.

> [!NOTE]
> **Authentication**: Most endpoints require a valid JWT token in the request cookies. The token is set automatically when you log in via `POST /api/login`. Endpoints that require authentication are marked with 🔒 (logged-in user) or 🔑 (admin only).

---

## Table of Contents

- [Common Response Schemas](#common-response-schemas)
- [Authentication](#authentication)
- [Texts](#texts)
- [Raw Texts](#raw-texts)
- [Normalizations](#normalizations)
- [Tokens](#tokens)
- [Whitelist](#whitelist)
- [Upload & Task Status](#upload--task-status)
- [OCR](#ocr)
- [Downloads](#downloads)
- [Assignments](#assignments)

---

## Common Response Schemas

These schemas appear across many endpoints:

**MessageResponse**
```json
{ "message": "Operation completed successfully." }
```

**ErrorResponse**
```json
{ "error": "Error description.", "code": "OPTIONAL_ERROR_CODE" }
```

**Validation Error** (Pydantic)
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "username", "message": "Field required" }
  ]
}
```

---

## Authentication

Source: [auth_routes.py](../app/routes/auth_routes.py)

### `POST /api/login`

Authenticates a user and sets a JWT cookie in the response.

| | |
|---|---|
| **Auth** | None |
| **Request Body** | `UserCredentials` |
| **Response** | `LoginResponse` |

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "isAdmin": true
}
```
A `Set-Cookie` header is also sent with the JWT access token. This is responsible for telling the browser to store the token.
**Note**: The isAdmin field should ONLY be used for conditionally showing admin-only features. It should NOT be used for authorization. The actual authentication is handled with the JWT token in the backend. 

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | User does not exist |
| `403` | Invalid password or account not active |

---

### `GET /api/logout`

Clears the JWT cookie, ending the user session.

| | |
|---|---|
| **Auth** | None |
| **Response** | `MessageResponse` |

**Success Response (200):**
```json
{ "message": "Logout successful" }
```

---

### `GET /api/me` 🔒

Returns basic profile information for the currently authenticated user.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `CurrentUserResponse` |

**Success Response (200):**
```json
{
  "username": "admin",
  "isAdmin": true
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Not authenticated |
| `401` | User not found or invalid token |

**Error Example (401):**
```json
{
  "error": "Not authenticated",
  "code": "AUTH_NOT_AUTHENTICATED"
}
```

---

### `POST /api/register` 🔑

Creates a new inactive user account. The user must later activate it via `/api/activate`.

| | |
|---|---|
| **Auth** | Admin required |
| **Request Body** | `UserRegisterRequest` |

**Request Body:**
```json
{ "username": "newuser" }
```

**Success Response (201):**
```json
{ "msg": "User created successfully" }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Username already exists |
| `401` | Not authenticated |
| `403` | Not an admin |

---

### `POST /api/activate`

Sets the password and activates an inactive account.

| | |
|---|---|
| **Auth** | None |
| **Request Body** | `UserActivationRequest` |

**Request Body:**
```json
{
  "username": "newuser",
  "password": "newpassword123"
}
```

**Success Response (200):**
```json
{ "message": "Account activated successfully." }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `404` | User does not exist |
| `400` | Account already active |

---

### `GET /api/users` 🔒

Returns a list of all usernames in the system.
* TODO: Refactor this endpoint with pagination.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `UsernamesResponse` |

**Success Response (200):**
```json
{ "usernames": ["admin", "user1", "user2"] }
```

---

### `GET /api/users/data` 🔑

Returns detailed data for all users.
* TODO: Refactor this endpoint with pagination.

| | |
|---|---|
| **Auth** | Admin required |
| **Response** | `UsersDataResponse` |

**Success Response (200):**
```json
{
  "usersData": [
    {
      "username": "admin",
      "isAdmin": true,
      "isActive": true,
      "lastLogin": "2026-02-20T15:30:00"
    }
  ]
}
```

---

### `PATCH /api/users/toggleActive` 🔑

Toggles a user's active/inactive status.

| | |
|---|---|
| **Auth** | Admin required |
| **Request Body** | `UserRegisterRequest` |

**Request Body:**
```json
{ "username": "targetuser" }
```

**Success Response (200):**
```json
{ "message": "User deactivated successfully." }
```
This functionality can also be used to reset the password of an user, forcing them to change it on their next login.

---

### `PATCH /api/users/toggleAdmin` 🔑

Toggles a user's admin privileges.

| | |
|---|---|
| **Auth** | Admin required |
| **Request Body** | `UserRegisterRequest` |

**Request Body:**
```json
{ "username": "targetuser" }
```

**Success Response (200):**
```json
{ "message": "User granted admin privileges." }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Cannot revoke admin from the last remaining admin |
| `404` | User not found |

---

## Texts

Source: [text_routes.py](../app/routes/text_routes.py)

### `GET /api/texts/` 🔒

Returns metadata for all processed texts, including the current user's normalization status and assigned users.

* TODO: Refactor this endpoint with pagination.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `TextsDataResponse` |

**Success Response (200):**
```json
{
  "textsData": [
    {
      "id": 1,
      "grade": 2,
      "normalizedByUser": false,
      "sourceFileName": "essay_001.txt",
      "usersAssigned": ["user1", "user2"]
    }
  ]
}
```

---

### `GET /api/texts/filtered` 🔒

Returns filtered texts based on query parameters.

* TODO: Refactor this endpoint with pagination.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `TextsDataResponse` |

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `grades` | string | Comma-separated grade values | `0,1,2` |
| `assigned_users` | string | Comma-separated usernames | `user1,user2` |
| `normalized` | string | Filter by normalized status | `true` or `false` |
| `file_name` | string | Fuzzy search on file name | `essay` |

**Example:** `GET /api/texts/filtered?grades=0,1&assigned_users=user1&normalized=true`

---

### `GET /api/texts/<text_id>` 🔒

Returns detailed information for a specific text, including all tokens with their suggestions and normalization candidates.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `TextDetailResponse` |

**Success Response (200):**
```json
{
  "id": 1,
  "grade": 2,
  "tokens": [
    {
      "id": 101,
      "text": "caza",
      "isWord": true,
      "position": 5,
      "toBeNormalized": true,
      "candidates": ["casa", "caça"],
      "whitespaceAfter": " ",
      "whitelisted": false
    }
  ],
  "normalizedByUser": false,
  "sourceFileName": "essay_001.txt",
  "assignedToUser": true
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `404` | Text not found |

---

## Raw Texts

Raw texts are unprocessed texts (e.g., from OCR) that have not yet been tokenized and analyzed.

### `GET /api/raw-texts/` 🔒

Returns metadata for all raw texts.

| | |
|---|---|
| **Auth** | Login required |

**Success Response (200):**
```json
{
  "textsData": [
    { "id": 1, "sourceFileName": "scanned_page_01.png" }
  ]
}
```

---

### `GET /api/raw-texts/<text_id>` 🔒

Returns the full content of a specific raw text.

| | |
|---|---|
| **Auth** | Login required |

**Success Response (200):**
```json
{
  "id": 1,
  "source_file_name": "scanned_page_01.png",
  "text_content": "The raw OCR text...",
  "image_path": "ocr_abc123.png"
}
```

---

### `PUT /api/raw-texts/<text_id>` 🔒

Updates the text content of a raw text (e.g., after manual correction of OCR output).

| | |
|---|---|
| **Auth** | Login required |

**Request Body:**
```json
{ "text_content": "Corrected text content..." }
```

**Success Response (200):**
```json
{ "message": "Text updated successfully" }
```

---

### `POST /api/raw-texts/<text_id>/finalize` 🔒

Finalizes a raw text by running full NLP processing (tokenization + suggestions), storing the result as a processed text, and deleting the raw text and its associated image.

| | |
|---|---|
| **Auth** | Login required |

**Request Body (optional):**
```json
{ "source_file_name": "custom_name.txt" }
```

**Success Response (200):**
```json
{ "message": "Text finalized successfully", "text_id": 42 }
```

---

## Normalizations

Normalizations are user-made corrections to tokens in a text. Each user has their own set of normalizations per text, e.g. each user can have their own "version" of a text.

### `GET /api/texts/<text_id>/normalizations` 🔒

Returns all normalizations made by the current user on a specific text.

| | |
|---|---|
| **Auth** | Login required |

**Success Response (200):**
```json
{
  "5": { "last_index": 6, "new_token": "casa" },
  "12": { "last_index": 12, "new_token": "porque" }
}
```
Keys are the `start_index` (token position) of each normalization. Normalizations can be more than one token long.

---

### `POST /api/texts/<text_id>/normalizations` 🔒

Creates or updates a normalization for the current user.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `NormalizationCreateRequest` |

**Request Body:**
```json
{
  "first_index": 5,
  "last_index": 6,
  "new_token": "casa",
  "suggest_for_all": false
}
```

| Field | Type | Description |
|---|---|---|
| `first_index` | int | Start token position (inclusive) |
| `last_index` | int | End token position (inclusive) |
| `new_token` | string | The replacement text |
| `suggest_for_all` | bool | If `true`, adds this as a suggestion for all matching tokens |

**Success Response (200):**
```json
{ "message": "Correction added: casa" }
```

---

### `DELETE /api/texts/<text_id>/normalizations` 🔒

Deletes a single normalization by token index.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `NormalizationDeleteRequest` |

**Request Body:**
```json
{ "word_index": 5 }
```

**Success Response (200):**
```json
{ "message": "Normalization deleted" }
```

---

### `DELETE /api/texts/<text_id>/normalizations/all` 🔒

Deletes all normalizations the current user has made on a specific text.

| | |
|---|---|
| **Auth** | Login required |

**Success Response (200):**
```json
{ "message": "All normalizations deleted" }
```

---

### `PATCH /api/texts/<text_id>/normalizations` 🔒

Toggles whether the current user has marked a text as "normalization complete." Can be used to filter texts afterwards.

| | |
|---|---|
| **Auth** | Login required |

**Success Response (200):**
```json
{ "message": "Status changed" }
```

---

## Tokens

### `PATCH /api/tokens/<token_id>/suggestions/toggle` 🔒

Toggles the `to_be_normalized` flag for a specific token. This flag determines whether the token is shown as requiring normalization for **all users**. This status simply changes the color of the token in the UI.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `toggleToBeNormalizedRequest` |

**Request Body:**
```json
{ "token_id": 42 }
```

**Success Response (200):**
```json
{ "message": "Token 'to_be_normalized' status toggled" }
```

---

## Whitelist

Whitelisted tokens are excluded from being marked as "to be normalized". Users are expected to use this for tokens that are repeatedly marked as "to be normalized" but are known to be correct.

### `GET /api/whitelist/` 🔒

Returns all whitelisted tokens.

| | |
|---|---|
| **Auth** | Login required |
| **Response** | `WhitelistTokensResponse` |

**Success Response (200):**
```json
{ "tokens": ["caza", "exemplo"] }
```

---

### `POST /api/whitelist/` 🔒
### `DELETE /api/whitelist/` 🔒

Adds or removes a token from the whitelist. Both methods use the same endpoint with an `action` field differentiating them. This functionality can be used to modify the whitelist at any time.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `WhitelistManageRequest` |

**Request Body:**
```json
{
  "token_text": "caza",
  "action": "add"
}
```
Valid `action` values: `"add"` or `"remove"`.

**Success Response (200):**
```json
{ "message": "Token 'caza' added to whitelist." }
```

---

## Upload & Task Status

Source: [upload_routes.py](../app/routes/upload_routes.py)

### `POST /api/upload` 🔑

Uploads a ZIP file containing `.txt` and/or `.docx` files for batch text processing. The processing runs asynchronously via Celery. The processing status can be polled using the `/api/status/<task_id>` endpoint.

| | |
|---|---|
| **Auth** | Admin required |
| **Content-Type** | `multipart/form-data` |

**Form Data:**

| Field | Type | Description |
|---|---|---|
| `file` | file | A `.zip` file containing text documents |

**Success Response (202):**
```json
{ "task_id": "abc123-def456" }
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | No file provided or invalid file type |

---

### `GET /api/status/<task_id>`

Polls the status of an asynchronous processing task.

| | |
|---|---|
| **Auth** | None |

**Responses by task state:**

**Pending:**
```json
{ "state": "PENDING", "status": "Waiting..." }
```

**In Progress:**
```json
{ "state": "PROGRESS", "status": "Processing file 3 of 10...", "current": 3, "total": 10 }
```

**Success:**
```json
{ "state": "SUCCESS", "status": "Finished", "result": { ... }, "failed_files": [] }
```

**Failure:**
```json
{ "state": "FAILURE", "status": "Processing Failed", "error": "Error details..." }
```

---

## OCR

Source: [ocr_routes.py](../app/routes/ocr_routes.py)

### `POST /api/ocr/upload` 🔑

Uploads a ZIP file containing images for OCR processing via Google Gemini. The processing runs asynchronously via Celery. Each image creates a raw text entry. The processing status can be polled using the `/api/status/<task_id>` endpoint.

| | |
|---|---|
| **Auth** | Admin required |
| **Content-Type** | `multipart/form-data` |
| **Max File Size** | 1000 MB |

**Form Data:**

| Field | Type | Description |
|---|---|---|
| `file` | file | A `.zip` file containing images |

**Success Response (202):**
```json
{ "task_id": "abc123-def456" }
```

---

### `GET /api/ocr/raw-texts/<text_id>/image` 🔑

Retrieves the original image file associated with a raw text created by OCR.

| | |
|---|---|
| **Auth** | Admin required |
| **Response** | Image file (binary) |

**Error Responses:**

| Status | Condition |
|---|---|
| `404` | Raw text not found or no image associated |

---

## Downloads

Source: [download_routes.py](../app/routes/download_routes.py)

### `POST /api/report/` 🔒

Generates a CSV report for the specified texts containing the current user's normalizations.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `ReportRequest` |
| **Response** | CSV file download |

**Request Body:**
```json
{ "text_ids": [1, 2, 3] }
```

---

### `POST /api/download/` 🔒

Downloads the normalized versions of specified texts as a ZIP file.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `DownloadRequest` |
| **Response** | ZIP file download |

**Request Body:**
```json
{
  "text_ids": [1, 2, 3],
  "use_tags": false
}
```

| Field | Type | Description |
|---|---|---|
| `text_ids` | int[] | List of text IDs to include |
| `use_tags` | bool | If `true`, wraps normalized tokens in XML `<tag>` syntax |

---

## Assignments

Source: [assignment_routes.py](../app/routes/assignment_routes.py)

### `POST /api/assignments/` 🔒

Bulk assigns texts to users using round-robin distribution.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `BulkAssignRequest` |

**Request Body:**
```json
{
  "text_ids": [1, 2, 3, 4, 5],
  "usernames": ["user1", "user2"]
}
```

**Success Response (200):**
```json
{
  "message": "Texts assigned successfully",
  "assignments": { "user1": 3, "user2": 2 },
  "totalTexts": 5,
  "totalUsers": 2
}
```

---

### `DELETE /api/assignments/` 🔒

Removes text assignments from specified users.

| | |
|---|---|
| **Auth** | Login required |
| **Request Body** | `BulkAssignRequest` |

**Request Body:**
```json
{
  "text_ids": [1, 2, 3],
  "usernames": ["user1"]
}
```

**Success Response (200):**
```json
{
  "message": "Assignments removed successfully",
  "unassignments": { "user1": 3 },
  "totalTexts": 3,
  "totalUsers": 1
}
```
