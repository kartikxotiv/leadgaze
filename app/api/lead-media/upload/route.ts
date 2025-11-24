import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { createLeadMedia } from "@/lib/data/lead-media";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const leadId = formData.get("leadId") as string;
    const createdBy = formData.get("createdBy") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "Lead ID is required" },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Get file extension and type
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
    const mediaType = file.type || `application/${fileExtension}`;

    // Create a unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filePath = `lead-media/${leadId}/${timestamp}-${randomString}-${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    // Note: You need to create a bucket named "lead-media" in Supabase Storage
    // with public access enabled, or adjust the bucket name and permissions
    const bucketName = "lead-media";

    let mediaUrl: string;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: mediaType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);

        // If bucket doesn't exist, provide helpful error message
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("not found")
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Storage bucket not found. Please create a bucket named 'lead-media' in Supabase Storage.",
              details: uploadError.message,
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "Failed to upload file to storage",
            details: uploadError.message,
          },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      mediaUrl = urlData.publicUrl;
    } catch (storageError) {
      console.error("Storage error:", storageError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to upload file to storage",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Save media record to database
    const mediaData: any = {
      lead_id: leadId,
      media_url: mediaUrl,
      media_type: mediaType,
      created_by: createdBy || null,
    };

    const media = await createLeadMedia(mediaData);

    return NextResponse.json({
      success: true,
      data: media,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
