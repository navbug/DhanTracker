import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const uploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|webp|gif)$/),
});

/**
 * PUT /api/upload
 * Returns a presigned S3 URL for direct browser upload.
 * Keeps binary data out of our API server entirely.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid file type or filename" },
        { status: 400 }
      );
    }

    const { filename, contentType } = parsed.data;

    // Check env vars
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    if (!bucket || !region) {
      // In dev without S3 configured, return a mock URL
      if (process.env.NODE_ENV === "development") {
        const mockUrl = `https://placeholder.dhan-tracker.dev/screenshots/${user.id}/${Date.now()}-${filename}`;
        return NextResponse.json({
          success: true,
          data: {
            uploadUrl: null, // No actual upload in dev without S3
            publicUrl: mockUrl,
            note: "S3 not configured — using placeholder URL in dev",
          },
        });
      }
      return NextResponse.json(
        { success: false, error: "S3 not configured" },
        { status: 503 }
      );
    }

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Key: userId/timestamp-filename — scoped per user
    const ext = filename.split(".").pop() ?? "jpg";
    const key = `screenshots/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // Set max 10MB
      // ContentLengthRange: { min: 1, max: 10 * 1024 * 1024 },
    } as Parameters<typeof PutObjectCommand>[0]);

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      data: { uploadUrl, publicUrl },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}
