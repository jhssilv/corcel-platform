import { z } from 'zod';

// --- Schemas Genéricos ---

/**
 * Schema para respostas de sucesso com uma mensagem simples.
 * Ex: { "message": "Operação realizada com sucesso" }
 */
export const MessageResponseSchema = z.object({
  message: z.string(),
});

// --- Schemas para /api/users ---

/**
 * Valida a resposta da rota GET /api/users.
 * Espera um array de strings com os nomes de usuário.
 */
export const UsernamesResponseSchema = z.object({
  usernames: z.array(z.string())
});

// --- Schemas para /api/login ---

/**
 * Valida o corpo da requisição para POST /api/login.
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório."),
  password: z.string().min(1, "A senha é obrigatória."),
});

/**
 * Valida a resposta bem-sucedida da rota POST /api/login.
 */
export const LoginResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string(), // Valida se a string é uma data no formato ISO 8601
  userId: z.number(),
});


// --- Schemas para /api/texts ---

/**
 * Valida o objeto de metadados de um único texto na lista de textos.
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
 * Valida a resposta da rota GET /api/texts/<user_id>/<text_id>.
 */
export const TextDetailResponseSchema = z.object({
  index: z.number(),
  tokens: z.array(z.string()),
  word_map: z.array(z.boolean()),
  candidates: z.record(z.any()).nullable(), // Representa um objeto JSONB genérico
  grade: z.number().nullable(),
  corrections: z.record(z.any()),
  teacher: z.string().nullable(),
  isCorrected: z.boolean(),
  sourceFileName: z.string().nullable(),
  correctedByUser: z.boolean(),
});


// --- Schemas para /api/texts/.../normalizations ---

/**
 * Valida a resposta da rota GET /api/texts/.../normalizations.
 * Espera um objeto onde as chaves são o índice da palavra (string)
 * e os valores são uma tupla [novo_token, indice_final].
 */
export const NormalizationsGetResponseSchema = z.record(
  z.string(), // Valida que a chave é uma string
  z.object({  // Valida que o valor é um objeto com a seguinte forma:
    last_index: z.number(),
    new_token: z.string(),
  })
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