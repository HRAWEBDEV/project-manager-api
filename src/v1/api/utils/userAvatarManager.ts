import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";

class InvalidImageTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageTypeError";
  }
}

class ImageTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageTooLargeError";
  }
}

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const savePath = "/static/images/avatars";

async function saveUserAvatar(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new InvalidImageTypeError(
      `Invalid image type (${file.type}), allowed types are ${ALLOWED_TYPES.join(", ")}`,
    );
  }
  if (file.size > MAX_SIZE) {
    throw new ImageTooLargeError(
      `Image is too large (${file.size} bytes, max ${MAX_SIZE} bytes)`,
    );
  }
  const extension =
    extname(file.name) ||
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    }[file.type] ||
    "";
  const filename = `${randomUUID()}${extension}`;
  const directory = join(process.cwd(), savePath);
  await mkdir(directory, {
    recursive: true,
  });
  const path = join(directory, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path, buffer);
  return `${savePath}/${filename}`;
}

async function deleteUserAvatar(avatarPath: string): Promise<void> {
  const filePath = join(process.cwd(), avatarPath);
  try {
    await unlink(filePath);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

export {
  InvalidImageTypeError,
  ImageTooLargeError,
  ALLOWED_TYPES,
  MAX_SIZE,
  saveUserAvatar,
  deleteUserAvatar,
};
