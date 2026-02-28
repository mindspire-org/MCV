import { useState } from "react";
import { Paperclip, X, Download, FileText, Image } from "lucide-react";
import { hospitalApi } from "../../utils/api";

interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

interface WorkflowAttachmentsProps {
  workflowItemId?: string;
  taskId?: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  readonly?: boolean;
}

export default function WorkflowAttachments({
  workflowItemId,
  taskId,
  attachments,
  onAttachmentsChange,
  readonly = false,
}: WorkflowAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let response;
      if (workflowItemId) {
        response = await hospitalApi.uploadWorkflowItemAttachment(
          workflowItemId,
          file,
        );
      } else if (taskId) {
        response = await hospitalApi.uploadWorkflowTaskAttachment(taskId, file);
      } else {
        throw new Error("No workflow item or task ID provided");
      }

      onAttachmentsChange([...attachments, response]);
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      // Clear the file input
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      if (workflowItemId) {
        await hospitalApi.deleteWorkflowItemAttachment(
          workflowItemId,
          attachmentId,
        );
      } else if (taskId) {
        await hospitalApi.deleteWorkflowTaskAttachment(taskId, attachmentId);
      }

      onAttachmentsChange(
        attachments.filter((att) => att._id !== attachmentId),
      );
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      alert("Failed to delete attachment");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getFileUrl = (attachment: Attachment) => {
    // For development, the backend URL might be different
    const baseUrl = window.location.origin;
    return `${baseUrl}${attachment.url}`;
  };

  if (readonly && attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Attachments</h3>
        {!readonly && (
          <label className="cursor-pointer">
            <span className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <Paperclip className="w-3 h-3 mr-1" />
                  Add File
                </>
              )}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </label>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">
          No attachments yet. {!readonly && "Click 'Add File' to upload."}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="text-gray-400">
                  {getFileIcon(attachment.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)} •{" "}
                    {new Date(attachment.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={getFileUrl(attachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                {!readonly && (
                  <button
                    onClick={() => handleDeleteAttachment(attachment._id)}
                    className="text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
