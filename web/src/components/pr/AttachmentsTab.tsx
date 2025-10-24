import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PurchaseRequest, PurchaseRequestAttachment } from "@/models/pr";
import { notify } from "@/lib/notify";
import { Paperclip } from "lucide-react";
import { OutlineButton } from "../ui/outline-button";

interface AttachmentsTabProps {
  purchaseRequest: Partial<PurchaseRequest>;
  onUploadAttachment: (
    file: File,
    type: string,
    description: string,
  ) => Promise<void>;
}

export function AttachmentsTab({
  purchaseRequest,
  onUploadAttachment,
}: AttachmentsTabProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showUploadDialog) return;
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      const item = clipboardData.items[0];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            notify.error('File too large! (Max: 10MB)');
            return;
          }
          if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            notify.error('Allowed file types: .png, .jpg, .jpeg, .pdf');
            return;
          }
          setFile(file);
          notify.success('File pasted from clipboard!');
        }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    }
  }, [showUploadDialog]);

  const handleUploadButton = () => {
    setFile(null);
    setType("");
    setDescription("");
    setShowUploadDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      notify.error("Please select a file to upload.");
      return;
    }

    if (!type) {
      notify.error("Please select an attachment type.");
      return;
    }

    setIsUploading(true);
    try {
      await onUploadAttachment(file, type, description);
      setShowUploadDialog(false);
      setFile(null);
      setType("");
      setDescription("");
    } finally {
      setIsUploading(false);
    }
  };

  const getAttachmentTypeStyle = (type: string) => {
    switch (type) {
      case "Receipt":
        return "bg-green-600/20 text-green-400 border-green-600/30";
      case "Checkout Page":
        return "bg-blue-600/20 text-blue-400 border-blue-600/30";
      case "Invoice":
        return "bg-purple-600/20 text-purple-400 border-purple-600/30";
      case "Quote":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "Other":
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };


  return (
    <>
      <div className="mx-20 my-10">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Attachments</h3>
          </div>
          <OutlineButton onClick={handleUploadButton}>Upload Attachment</OutlineButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchaseRequest.attachments && purchaseRequest.attachments.length > 0 ? (
            purchaseRequest.attachments.map((attachment: PurchaseRequestAttachment) => (
              <Card key={attachment.id} className="relative flex flex-col h-full">
                <CardContent className="p-4 flex-1">
                    <div className="justify-between">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          By: {attachment.user?.first_name
                            ? `${attachment.user.first_name} ${attachment.user.last_name}`
                            : "Unknown User"}
                        </p>
                        <span
                          className={`rounded-md border px-2 py-1 text-sm font-medium ${getAttachmentTypeStyle(attachment.type)}`}
                        >
                          {attachment.type}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex py-2 items-center justify-between">
                          <p className="text-gray-300 text-sm">
                          File: {attachment.filename}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(attachment.created_at).toLocaleString()}
                        </p>
                        </div>
                        
                        {attachment.description && (
                          <p className="text-gray-300 text-sm">
                            Description: {attachment.description}
                          </p>
                        )}
                      </div>
                      
                      {attachment.content_type?.startsWith('image/') && (
                        <div className="mt-4">
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full h-48 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                </CardContent>
                <CardFooter>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline text-sm hover:text-blue-300"
                  >
                    View File in New Tab
                  </a>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="py-12 text-center">
                  <p>No attachments yet.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload Attachment</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file" className="text-white flex items-center">
                Selected File<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="opacity-0"
                />
                {file ? (
                  <div className="absolute inset-0 flex items-center px-3 text-sm text-white border rounded-md pointer-events-none">
                    {file.name}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center px-3 text-sm text-white border rounded-md pointer-events-none">
                    Click to select a file or paste from clipboard.
                  </div>
                )}
              </div>
          </div>
            <div>
              <Label htmlFor="type" className="text-white">
                Attachment Type<span className="text-red-500">*</span>
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                  <SelectItem value="Checkout Page">Checkout Page</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Quote">Quote</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUploading}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleUpload} disabled={isUploading || !file || !type}>
              {isUploading ? "Uploading..." : "Upload Attachment"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}