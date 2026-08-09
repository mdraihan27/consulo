import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

class CloudinaryHandler {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "consulo_cloud",
      api_key: process.env.CLOUDINARY_API_KEY || "",
      api_secret: process.env.CLOUDINARY_API_SECRET || ""
    });
  }

  async uploadImage(base64Str: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64Str, {
        folder: "consulo_certifications"
      });
      return result.secure_url;
    } catch (error: any) {
      console.error("[CloudinaryHandler] Upload failed:", error.message || error);
      throw error;
    }
  }

  async uploadProfilePicture(base64Str: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64Str, {
        folder: "consulo_profile_pictures",
        transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }]
      });
      return result.secure_url;
    } catch (error: any) {
      console.error("[CloudinaryHandler] Profile picture upload failed:", error.message || error);
      throw error;
    }
  }

  async uploadChatFile(base64Str: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64Str, {
        folder: "consulo_chat_files",
        resource_type: "auto"
      });
      return result.secure_url;
    } catch (error: any) {
      console.error("[CloudinaryHandler] Chat file upload failed:", error.message || error);
      throw error;
    }
  }
}

export { CloudinaryHandler };
