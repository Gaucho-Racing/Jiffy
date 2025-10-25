import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PurchaseRequest, PurchaseRequestNote, NoteType } from "@/models/pr";
import { notify } from "@/lib/notify";
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
        return "bg-green-600/30 text-green-300 border-green-600/30";
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

  return (
    <>
      <div className="mx-20 my-10">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Activity & Note History</h3>
          </div>
          <OutlineButton onClick={handleAddNoteButton}>Add Note</OutlineButton>
        </div>

        <div className="space-y-2">
          {purchaseRequest.notes && purchaseRequest.notes.length > 0 ? (
            purchaseRequest.notes.map((note: PurchaseRequestNote) => (
              <Card key={note.id} className="relative">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      By:{" "}
                      {note.user?.first_name
                        ? `${note.user.first_name} ${note.user.last_name}`
                        : "Unknown User"}
                    </p>
                    <span
                      className={`rounded-md border px-2 py-1 text-sm font-medium ${getNoteTypeStyle(note.type)}`}
                    >
                      {note.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-300">Note: {note.note}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p>No Notes yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Note</AlertDialogTitle>
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
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleCreateNewNote} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Note"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
