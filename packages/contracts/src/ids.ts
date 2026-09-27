import z from "zod";

export type UserId = z.infer<typeof UserIdSchema>;
export type NotebookId = z.infer<typeof NotebookIdSchema>;
export type NotebookMemberId = z.infer<typeof NotebookMemberIdSchema>;
export type NodeId = z.infer<typeof NodeIdSchema>;

export const UserIdSchema = z.uuid();
export const NotebookIdSchema = z.uuid();
export const NotebookMemberIdSchema = z.uuid();
export const NodeIdSchema = z.uuid();
