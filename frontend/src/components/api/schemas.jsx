import { z } from 'zod';

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
  timestamp: z.string(), // Validates if the string is a date in ISO 8601 format
  userId: z.number(),
});


// --- Schemas for /api/texts ---

/**
 * Validates the metadata object of a single text in the list of texts.
 */
const TextMetadataSchema = z.object({
    id: z.number(),
    grade: z.number().nullable(),
    users_who_normalized: z.array(z.string()),
    normalized_by_user: z.boolean(),
    source_file_name: z.string().nullable(),
    assigned_to_user: z.boolean(),
});

/**
 * Valida a resposta da rota GET /api/texts/<user_id>.
 */
export const TextsDataResponseSchema = z.object({
  textsData: z.array(TextMetadataSchema),
});

/**
 * Validates the response from the GET /api/texts/<user_id>/<text_id> route.
 */
export const TextDetailResponseSchema = z.object({
  index: z.number(),
  tokens: z.array(z.string()),
  wordMap: z.array(z.boolean()),
  candidates: z.record(z.any()).nullable(), // Represents a generic JSONB object
  grade: z.number().nullable(),
  corrections: z.record(z.any()),
  teacher: z.string().nullable(),
  isCorrected: z.boolean(),
  sourceFileName: z.string().nullable(),
  correctedByUser: z.boolean()
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
});

/**
 * Valida o corpo da requisição para DELETE /api/texts/.../normalizations.
 */
export const NormalizationDeleteRequestSchema = z.object({
  word_index: z.number(),
});