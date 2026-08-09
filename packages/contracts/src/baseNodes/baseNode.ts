import z from "zod";

export const BaseNode = z.object({
    _id: z.uuid(),
    projectId: z.uuid(),
    title: z.string(),
    aliases: z.string().array(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
