// src/modules/upload/upload.service.ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

export interface UploadedFileBuffer {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class UploadService {
  // ── Image upload (products, etc.) ─────────────────────
  async uploadImage(
    file: UploadedFileBuffer,
    folder = "kurate/products",
  ): Promise<string> {
    try {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder,
        resource_type: "image",
        timeout: 120000, // ✅ 2 minutes timeout
        // transformation temporarily disabled for speed; re‑enable if needed
        // transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });

      return result.secure_url;
    } catch (error: any) {
      console.error("Cloudinary upload error:", error?.error || error);
      throw new InternalServerErrorException("Image upload failed");
    }
  }

  async uploadCertificate(
    file: UploadedFileBuffer,
    folder = "kurate/certificates",
  ): Promise<string> {
    try {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder,
        resource_type: "auto",
        timeout: 120000, // ✅ 2 minutes timeout
      });

      return result.secure_url;
    } catch (error: any) {
      console.error("Cloudinary upload error:", error?.error || error);
      throw new InternalServerErrorException("Certificate upload failed");
    }
  }
};
