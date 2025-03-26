import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/auth";

const API_URL = import.meta.env.VITE_API_URL;

type UploadedFile = {
  id: string;
  name: string;
  content: string;
  file_type: string;
  content_length: number;
  selected?: boolean;
};

export const UploadFile = ({
  sessionId,
  setFileIDs,
}: {
  sessionId: string;
  setFileIDs: (fileIDs: string[]) => void;
}) => {
  const { bearerToken } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const updateSelectedFileIDs = (updatedFiles: UploadedFile[]) => {
    const selectedIDs = updatedFiles
      .filter((file) => file.selected)
      .map((file) => file.id);
    setFileIDs(selectedIDs);
  };

  const toggleFileSelection = (fileId: string) => {
    const updatedFiles = files.map((file) =>
      file.id === fileId ? { ...file, selected: !file.selected } : file
    );
    setFiles(updatedFiles);
    updateSelectedFileIDs(updatedFiles);
  };

  const fetchFiles = async () => {
    if (!sessionId || !bearerToken) return;

    try {
      const response = await fetch(
        `${API_URL}/api/agents/get_files/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      const formattedFiles = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        content:
          file.content.length > 50
            ? `${file.content.substring(0, 50)}...`
            : file.content,
        file_type: file.file_type,
        content_length: file.content_length,
        selected: false,
      }));
      setFiles(formattedFiles);
      updateSelectedFileIDs(formattedFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const uploadFile = async (file: File) => {
    if (!sessionId) {
      console.error("No valid session ID");
      return null;
    }

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", file);

    try {
      setIsUploading(true);
      const response = await fetch(`${API_URL}/api/agents/upload_file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const truncatedContent =
        data.content_length > 50
          ? `${data.content.substring(0, 50)}...`
          : data.content;

      // Trigger a refresh after successful upload
      setRefreshTrigger((prev) => prev + 1);

      return {
        id: data.file_id,
        name: file.name,
        content: truncatedContent,
        file_type: data.file_type,
        content_length: data.content_length,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await uploadFile(file);
      }
      await fetchFiles();
    },
    [sessionId, bearerToken]
  );

  useEffect(() => {
    if (sessionId && bearerToken) {
      fetchFiles();
    }
  }, [sessionId, bearerToken, refreshTrigger]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
    },
  });

  // Only show component when we have a valid session
  if (!sessionId) {
    return null;
  }

  return (
    <div className="flex flex-col w-80 h-full border-l border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm p-4">
      <h2 className="text-lg font-bold font-raleway mb-4">Upload Files</h2>

      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl
          p-6 mb-4 cursor-pointer
          transition-all duration-200
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
          }
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className="w-8 h-8 mb-2 text-blue-500 animate-spin" />
        ) : (
          <Upload
            className={`w-8 h-8 mb-2 ${
              isDragActive ? "text-blue-500" : "text-gray-400"
            }`}
          />
        )}

        {isUploading ? (
          <p className="text-sm text-center text-blue-500 font-bitter">
            Uploading...
          </p>
        ) : isDragActive ? (
          <p className="text-sm text-center text-blue-500 font-bitter">
            Drop files here...
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-bitter">
              Drag & drop files here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-bitter">
              or click to select
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => toggleFileSelection(file.id)}
            className={`
              flex flex-col gap-1 p-3 mb-2 rounded-lg 
              cursor-pointer transition-all duration-200
              ${
                file.selected
                  ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                  : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800/80"
              }
            `}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <File
                  className={`w-4 h-4 ${
                    file.selected ? "text-blue-500" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-sm font-medium font-bitter ${
                    file.selected ? "text-blue-700 dark:text-blue-300" : ""
                  }`}
                >
                  {file.name}
                </span>
              </div>
              <div
                className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${
                  file.selected
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-gray-600"
                }
              `}
              >
                {file.selected && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <p
              className={`text-xs font-bitter pl-6 ${
                file.selected
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500"
              }`}
            >
              {file.content}
            </p>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bitter text-gray-600 dark:text-gray-400">
              Selected: {files.filter((f) => f.selected).length} of{" "}
              {files.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const allSelected = files.every((f) => f.selected);
                const updatedFiles = files.map((f) => ({
                  ...f,
                  selected: !allSelected,
                }));
                setFiles(updatedFiles);
                updateSelectedFileIDs(updatedFiles);
              }}
              className="text-sm font-bitter text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {files.every((f) => f.selected) ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
