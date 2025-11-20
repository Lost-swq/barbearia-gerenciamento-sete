import { z } from "zod";

export const adminSignupSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100, "Senha muito longa"),
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50, "Nome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  sobrenome: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres").max(50, "Sobrenome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Sobrenome deve conter apenas letras"),
});

export const clientSignupSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100, "Senha muito longa"),
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50, "Nome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  sobrenome: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres").max(50, "Sobrenome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Sobrenome deve conter apenas letras"),
  cpf: z.string().regex(/^\d{5}$/, "CPF deve ter exatamente 5 dígitos"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const clienteCreateSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(50, "Nome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  sobrenome: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres").max(50, "Sobrenome muito longo").regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Sobrenome deve conter apenas letras"),
  cpf: z.string().regex(/^\d{5}$/, "CPF deve ter exatamente 5 dígitos"),
  plano: z.enum(["COPA_BRASIL", "UEFA_CL"]),
});