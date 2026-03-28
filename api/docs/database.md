# Database Schema

This document describes the PostgreSQL database schema used by the Corcel Platform backend. It covers all tables, their relationships, and the query functions used to access data.

Source files: [models.py](../app/database/models.py) · [queries.py](../app/database/queries.py) · [connection.py](../app/database/connection.py)

---

## Entity–Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        varchar(30) username UK
        varchar(120) hashed_password
        timestamp last_login
        bool is_admin
        bool is_active
    }

    texts {
        int id PK
        smallint grade
        varchar(255) source_file_name
        timestamp creation_date
    }

    raw_texts {
        int id PK
        varchar(255) source_file_name
        text text_content
        varchar(255) image_path
    }

    tokens {
        int id PK
        int text_id FK
        varchar(64) token_text
        bool is_word
        int position
        bool to_be_normalized
        char(1) whitespace_after
        bool whitelisted
    }

    normalizations {
        int text_id PK_FK
        int user_id PK_FK
        int start_index PK
        int end_index
        varchar(64) new_token
        timestamp creation_time
    }

    textsusers {
        int text_id PK_FK
        int user_id PK_FK
        bool assigned
        bool normalized
    }

    suggestions {
        int id PK
        varchar(64) token_text UK
    }

    tokenssuggestions {
        int token_id PK_FK
        int suggestion_id PK_FK
    }

    whitelist_tokens {
        int id PK
        varchar(64) token_text UK
    }

    users ||--o{ normalizations : "makes"
    users ||--o{ textsusers : "assigned to"
    texts ||--o{ tokens : "contains"
    texts ||--o{ normalizations : "has"
    texts ||--o{ textsusers : "assigned to"
    tokens ||--o{ tokenssuggestions : "has"
    suggestions ||--o{ tokenssuggestions : "linked to"
```

---

## Table Reference

### `users`

Stores registered user accounts. Passwords are hashed with bcrypt.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique user identifier |
| `username` | `VARCHAR(30)` | NOT NULL, UNIQUE | Login name |
| `hashed_password` | `VARCHAR(120)` | NOT NULL | Bcrypt hash of the password |
| `last_login` | `TIMESTAMP` | Nullable | Last login timestamp |
| `is_admin` | `BOOLEAN` | NOT NULL, default `false` | Admin privileges flag |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Account activation status |

**Relationships:**
- One-to-many with `normalizations` (cascade delete)
- One-to-many with `textsusers` (cascade delete)

---

### `texts`

Stores processed texts — the core entity of the platform. Each text has been tokenized and analyzed by the NLP pipeline.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique text identifier |
| `grade` | `SMALLINT` | Nullable | Grade/score (if applicable) |
| `source_file_name` | `VARCHAR(255)` | Nullable | Original file name |
| `creation_date` | `TIMESTAMP` | NOT NULL, default `now()` | When the text was imported |

**Relationships:**
- One-to-many with `tokens` (cascade delete, ordered by `position`)
- One-to-many with `normalizations` (cascade delete)
- One-to-many with `textsusers` (cascade delete)
- The `grade` field is used by the developers of the platform, but is defined as nullable as it may not be applicable to other users. It is currently manually set with a query in the database.

---

### `raw_texts`

Stores unprocessed texts before tokenization — typically created by OCR or manual upload. Once a raw text is finalized (via `/api/raw-texts/<id>/finalize`), it is converted to a `texts` record and deleted. Differently from `texts`, `raw_texts` stores the tokens as a single string in the `text_content` column.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique identifier |
| `source_file_name` | `VARCHAR(255)` | Nullable | Original file/image name |
| `text_content` | `TEXT` | NOT NULL | The raw text content |
| `image_path` | `VARCHAR(255)` | Nullable | Path to the source image (OCR only) |

> `raw_texts` has no foreign key relationships. It is a staging table that exists temporarily before the text is finalized into the main pipeline.

---

### `tokens`

Stores individual tokens (words, punctuation, etc.) from processed texts. Each token has a unique position within its parent text.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique token identifier |
| `text_id` | `INTEGER` | FK → `texts.id`, ON DELETE CASCADE, indexed | Parent text |
| `token_text` | `VARCHAR(64)` | NOT NULL | The token string |
| `is_word` | `BOOLEAN` | NOT NULL | `true` if alphabetic (not punctuation) |
| `position` | `INTEGER` | NOT NULL | Position index within the text |
| `to_be_normalized` | `BOOLEAN` | Nullable | Whether marked for normalization |
| `whitespace_after` | `CHAR(1)` | Nullable, default `''` | Whitespace character following this token |
| `whitelisted` | `BOOLEAN` | NOT NULL, default `false` | Whether this token is whitelisted |

**Constraints:**
- `UNIQUE(text_id, position)` — no two tokens can occupy the same position in a text

**Relationships:**
- Belongs to `texts`
- Many-to-many with `suggestions` via `tokenssuggestions`

---

### `normalizations`

Stores user-made corrections (normalizations) to tokens. Each user has their own independent set of normalizations per text, allowing different users to create coexisting "versions" of the same text.

A normalization replaces one or more consecutive tokens (from `start_index` to `end_index`) with a `new_token`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `text_id` | `INTEGER` | PK, FK → `texts.id`, ON DELETE CASCADE | The text being normalized |
| `user_id` | `INTEGER` | PK, FK → `users.id`, ON DELETE CASCADE | The user who made the correction |
| `start_index` | `INTEGER` | PK | First token position (inclusive) |
| `end_index` | `INTEGER` | Nullable | Last token position (inclusive) |
| `new_token` | `VARCHAR(64)` | NOT NULL | The replacement text |
| `creation_time` | `TIMESTAMP` | NOT NULL | When the normalization was created |

**Composite Primary Key:** `(text_id, user_id, start_index)` — one correction per user per starting position.

---

### `textsusers`

Association table tracking which texts are **assigned** to which users, and whether the user has **marked the text as normalized**.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `text_id` | `INTEGER` | PK, FK → `texts.id`, ON DELETE CASCADE | The text |
| `user_id` | `INTEGER` | PK, FK → `users.id`, ON DELETE CASCADE | The user |
| `assigned` | `BOOLEAN` | NOT NULL, default `false` | Whether the text is assigned to the user |
| `normalized` | `BOOLEAN` | NOT NULL, default `false` | Whether the user marked the text as complete |

---

### `suggestions`

Stores unique suggestion strings. Suggestions are normalization candidates that can be shared across many tokens (e.g., the suggestion `"casa"` may apply to every token `"caza"` in the corpus).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique suggestion identifier |
| `token_text` | `VARCHAR(64)` | NOT NULL, UNIQUE | The suggested replacement text |

---

### `tokenssuggestions`

Junction table linking tokens to their suggestions (many-to-many).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `token_id` | `INTEGER` | PK, FK → `tokens.id`, ON DELETE CASCADE | The token |
| `suggestion_id` | `INTEGER` | PK, FK → `suggestions.id`, ON DELETE CASCADE | The suggestion |

---

### `whitelist_tokens`

Stores tokens that should be excluded from being flagged as "to be normalized." When a token is added to the whitelist, all matching `tokens` rows have their `whitelisted` flag set to `true`. This query can be very slow, depending on the size of the corpus and number of whitelisted tokens. Use with caution. Maybe it would be a good idea to rate-limit the endpoint that uses it.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PK, auto-increment | Unique identifier |
| `token_text` | `VARCHAR(64)` | NOT NULL, UNIQUE | The whitelisted token text |

---

## Connection & Configuration

The database connection is configured via the `DATABASE_URL` environment variable (see [configuration.md](configuration.md)):

```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

There are two ways the app connects to the database:

| Module | Use Case |
|---|---|
| [connection.py](../app/database/connection.py) | Standalone scripts — creates its own `engine` and `SessionLocal` |
| [extensions.py](../app/extensions.py) + [config.py](../app/config.py) | Flask app — uses Flask-SQLAlchemy (`db = SQLAlchemy()`) initialized in `create_app()` |

> Route handlers and query functions use the Flask-SQLAlchemy `db.session`, not the standalone `SessionLocal`. If you write standalone scripts that access the database outside of Flask, use the `connection.py` module instead.

### Creating Tables

To create all tables from the models (useful for initial setup or development):

```python
# Using connection.py directly
from app.database.connection import engine
from app.database.models import Base

Base.metadata.create_all(bind=engine)
```

---

## Query Functions Reference

All query functions are in [queries.py](../app/database/queries.py). They receive a SQLAlchemy session (`db`) as their first argument.

### Authentication & Users

| Function | Description |
|---|---|
| `authenticate_user(db, username, password)` | Verifies credentials, returns `(True, user_id)` or `(False, None)` |
| `get_user_by_username(db, username)` | Fetches a `User` by username |
| `get_usernames(db)` | Returns all usernames as tuples |
| `get_username_by_id(db, user_id)` | Returns the username for a given user ID |
| `get_all_users(db)` | Returns all `User` objects ordered by ID |
| `get_user_ids_by_usernames(db, usernames)` | Converts username list to user ID list, preserving order |
| `count_admin_users(db)` | Returns the count of admin users |

### Texts

| Function | Description |
|---|---|
| `get_texts_data(db, user_id)` | All texts with metadata (grade, file name, normalization status, assigned users) |
| `get_filtered_texts(db, grades, assigned_users, user_id, file_name)` | Filtered text list with optional grade, assignment, normalization, and filename filters |
| `get_text_by_id(db, text_id, user_id)` | Full text detail with tokens, suggestions, and user-specific status |
| `get_original_text_tokens_by_id(db, text_id)` | All tokens of a text without normalizations, sorted by position |
| `add_text(text_obj, tokens_with_candidates, db)` | Inserts a new text with tokens and their suggestion candidates |
| `add_raw_text(db, tokens, source_file_name)` | Inserts a new text from raw token list |

### Raw Texts

| Function | Description |
|---|---|
| `get_raw_texts(db)` | All raw text IDs and filenames |
| `get_raw_text_by_id(db, text_id)` | Full raw text details (content, image path) |
| `update_raw_text_content(db, text_id, new_content)` | Updates the text content of a raw text |

### Normalizations

| Function | Description |
|---|---|
| `get_normalizations_by_text(db, text_id, user_id)` | All normalizations by a user on a text |
| `save_normalization(db, ..., suggest_for_all)` | Creates or updates a normalization; optionally creates a global suggestion |
| `delete_normalization(db, text_id, user_id, start_index)` | Deletes a single normalization |
| `delete_all_normalizations(db, user_id, text_id)` | Deletes all normalizations by a user on a text |
| `toggle_normalized(db, text_id, user_id)` | Toggles the user's "normalization complete" flag |

### Suggestions & Tokens

| Function | Description |
|---|---|
| `add_suggestion(text_id, token_id, text, db)` | Creates a suggestion and links it to a token (handles concurrent inserts) |
| `toggle_to_be_normalized(db, token_id)` | Toggles the `to_be_normalized` flag on a token |

### Whitelist

| Function | Description |
|---|---|
| `get_whitelist_tokens(db)` | Returns all whitelisted token strings |
| `add_whitelist_token(db, token_text)` | Adds a token to the whitelist and flags all matching tokens |
| `remove_whitelist_token(db, token_text)` | Removes from whitelist and unflags all matching tokens |

### Assignments

| Function | Description |
|---|---|
| `assign_text_to_user(db, text_id, user_id)` | Assigns a single text to a user |
| `bulk_assign_texts(db, text_ids, user_ids)` | Round-robin assignment of texts across users |
| `bulk_unassign_texts(db, text_ids, user_ids)` | Removes assignments for specified texts and users |
