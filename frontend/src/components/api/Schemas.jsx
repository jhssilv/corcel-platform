import { z } from 'zod';
import { is } from 'zod/v4/locales';

/**
 * Schema for successful responses with a message.
 * Ex: { "message": "Operation successful" }
 */
export const MessageResponseSchema = z.object({
  message: z.string(),
});

// --- Schemas for /api/users ---

/**
 * Validates the response from the GET /api/users route.
 * Expects an array of strings with the usernames.
 */
export const UsernamesResponseSchema = z.object({
  usernames: z.array(z.string())
});

// --- Schemas for /api/login ---

/**
 * Validates the request body for POST /api/login.
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório."),
  password: z.string().min(1, "A senha é obrigatória."),
});

/**
 * Validates the successful response from the POST /api/login route.
 */
export const LoginResponseSchema = z.object({
  message: z.string(),
  isAdmin: z.boolean(),
});


// --- Schemas for /api/texts ---

/**
 * Validates the metadata object of a single text in the list of texts.
 */
const TextMetadataSchema = z.object({
    id: z.number(),
    grade: z.number().nullable(),
    usersAssigned: z.array(z.string()),
    normalizedByUser: z.boolean(),
    sourceFileName: z.string().nullable(),
    isRaw: z.boolean().optional().default(false),
});

/**
 * Valida a resposta da rota GET /api/texts/<user_id>.
 */
export const TextsDataResponseSchema = z.array(TextMetadataSchema);

/**
 * Validates each token object in the detailed text view.
 */
const TokenDetailSchema = z.object({
  [z.number()]: z.object({
    text: z.string(),
    isWord: z.boolean(),
    candidates: z.array(z.string()),
    toBeNormalized: z.boolean(),
    whitespaceAfter: z.string(),
    id: z.number(),
    whitelisted: z.boolean(),
  })
});


/**
 * Validates the response from the GET /api/texts/<user_id>/<text_id> route.
 */
export const TextDetailResponseSchema = z.object({
  id: z.number(),
  grade: z.number().nullable(),
  tokens: z.array(TokenDetailSchema),
  normalizedByUser: z.boolean(),
  sourceFileName: z.string().nullable(),
  assignedToUser: z.boolean(),
  usersWhoNormalized: z.array(z.string()),
  isRaw: z.boolean().optional().default(false),
});


// --- Schemas for /api/texts/.../normalizations ---

/**
 * Validates the response from the GET /api/texts/.../normalizations route.
 * Expects a series of objects indexed by the word index. In the format:
 * {3: {last_index: 5, new_token: "correction"}, ...}
 */
const NormalizationItemSchema = z.object({
    last_index: z.number(),
    new_token: z.string()
});

export const NormalizationsGetResponseSchema = z.record(
  z.string(),
  NormalizationItemSchema
);


/**
 * Valida o corpo da requisição para POST /api/texts/.../normalizations.
 */
export const NormalizationCreateRequestSchema = z.object({
  first_index: z.number(),
  last_index: z.number(),
  new_token: z.string(),
  suggest_for_all: z.boolean().optional(),
});

/**
 * Valida o corpo da requisição para DELETE /api/texts/.../normalizations.
 */
export const NormalizationDeleteRequestSchema = z.object({
  word_index: z.number(),
});

export const DownloadRequestSchema = z.object({
  text_ids: z.array(z.number()).min(1, "At least one text ID must be provided."),
  use_tags: z.boolean().optional(),
});

export const UploadResponseSchema = z.object({
  task_id: z.string(),
});

export const TaskStatusResponseSchema = z.object({
  state: z.string(),
  status: z.string(),
  current: z.number().optional(),
  total: z.number().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  failed_files: z.array(z.string()).optional(),
});

export const WhitelistTokensResponseSchema = z.object({
  tokens: z.array(z.string()),
});

export const WhitelistTokenAddRequestSchema = z.object({
  token_text: z.string().min(1, "Token text cannot be empty."),
});

export const WhitelistTokenRemoveRequestSchema = z.object({
  token_text: z.string().min(1, "Token text cannot be empty."),
});

const UsersData = z.object({
  username: z.string(),
  isAdmin: z.boolean(),
  isActive: z.boolean(),
  lastLogin: z.string().nullable(),
});

export const UsersDataResponseSchema = z.array(UsersData);

