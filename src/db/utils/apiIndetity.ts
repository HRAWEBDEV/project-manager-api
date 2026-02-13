import { z } from "zod";

const uuidSchema = z.object({
  id: z.string(),
});

function parseUUID(uuid: string) {
  uuidSchema.shape.id.parse(uuid);
}

export { parseUUID, uuidSchema };
