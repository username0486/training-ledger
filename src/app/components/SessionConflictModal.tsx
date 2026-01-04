import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface SessionConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: 'exercise' | 'workout';
  sessionName: string;
  onResume: () => void;
  onDiscard: () => void;
  onSaveAndContinue?: () => void;
}

export function SessionConflictModal({
  isOpen,
  onClose,
  sessionType,
  sessionName,
  onResume,
  onDiscard,
  onSaveAndContinue,
}: SessionConflictModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Workout in progress"
      headerAction={
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
        >
          <X className="w-5 h-5" />
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-text-muted text-center">
          You have an active workout already open.
        </p>

        <div className="space-y-3">
          <Button onClick={onResume} variant="primary" className="w-full">
            Resume workout
          </Button>
          
          <Button onClick={onDiscard} variant="neutral" className="w-full">
            Start new workout
          </Button>
        </div>
      </div>
    </Modal>
  );
}