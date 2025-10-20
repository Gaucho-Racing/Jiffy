import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PurchaseRequest,
  PurchaseRequestNote,
  NoteType,
} from "@/models/pr";
import { notify } from "@/lib/notify";
import { MessageSquare } from "lucide-react";
import { OutlineButton } from "../ui/outline-button";

interface NotesTabProps {
  purchaseRequest: Partial<PurchaseRequest>;
  onCreateNote: (note: string) => Promise<void>;
}

export function NotesTab({ purchaseRequest, onCreateNote }: NotesTabProps) {
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNoteButton = () => {
    setNewNote("");
    setShowAddNoteDialog(true);
  };

  const handleCreateNewNote = async () => {
    if (!newNote) {
      notify.error("Please enter a comment/note.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateNote(newNote);
      setShowAddNoteDialog(false);
      setNewNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNoteTypeStyle = (type: NoteType) => {
    switch (type) {
      case NoteType.RequestSubmitted:
        return "bg-blue-600/20 text-blue-400 border-blue-600/30";
      case NoteType.Approved:
        return "bg-green-600/20 text-green-400 border-green-600/30";
      case NoteType.Rejected:
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case NoteType.StatusChanged:
        return "bg-purple-600/20 text-purple-400 border-purple-600/30";
      case NoteType.RequestAmended:
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case NoteType.Comment:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
      case NoteType.AttachmentUploaded:
        return "bg-cyan-600/20 text-cyan-400 border-cyan-600/30";
      case NoteType.AttachmentDeleted:
        return "bg-orange-600/20 text-orange-400 border-orange-600/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
    <div className="mx-20 my-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-semibold">Activity & Note History</h3>
        </div>
        <OutlineButton onClick={handleAddNoteButton}>
          Add Note
        </OutlineButton>
      </div>

      {/* Notes Timeline */}
      <div className="space-y-2">
        {purchaseRequest.notes && purchaseRequest.notes.length > 0 ? (
          purchaseRequest.notes.map((note: PurchaseRequestNote) => (
            <Card key={note.id} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {note.user?.first_name
                            ? `${note.user.first_name} ${note.user.last_name}`
                            : "Unknown User"}
                        </p>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium border ${getNoteTypeStyle(note.type)}`}
                        >
                          {note.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 flex-shrink-0">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {note.note}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                No notes yet. Add one to start tracking activity.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>

    <AlertDialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Note</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-white">
              Add a comment or note to this purchase request.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="note-message" className="text-white">
              Comment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="note-message"
              placeholder="Enter your comment here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button onClick={handleCreateNewNote} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Note"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

