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

class StaticImagesService {
  static readonly basePath: string = "/static/images";
  private options: {
    maxSize: number;
    allowedTypes: string[];
    savePath: string;
  };
  constructor(options: {
    maxSize?: number;
    allowedTypes?: string[];
    savePath: string;
  }) {
    this.options = Object.assign(
      {
        maxSize: MAX_SIZE,
        allowedTypes: ALLOWED_TYPES,
      },
      options,
    );
  }

  async saveStaticImage(file: File): Promise<string> {
    if (!this.options.allowedTypes.includes(file.type)) {
      throw new InvalidImageTypeError(
        `Invalid image type (${file.type}), allowed types are ${this.options.allowedTypes.join(", ")}`,
      );
    }
    if (file.size > this.options.maxSize) {
      throw new ImageTooLargeError(
        `Image is too large (${file.size} bytes, max ${this.options.maxSize} bytes)`,
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
    const directory = join(
      process.cwd(),
      StaticImagesService.basePath,
      this.options.savePath,
    );
    await mkdir(directory, {
      recursive: true,
    });
    const path = join(directory, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path, buffer);
    return `${StaticImagesService.basePath}/${this.options.savePath}/${filename}`;
  }

  async deleteStaticImage(avatarPath: string): Promise<void> {
    const filePath = join(process.cwd(), avatarPath);
    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export { StaticImagesService, InvalidImageTypeError, ImageTooLargeError };
