import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface SessionConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  inProgressSessionType: 'exercise' | 'workout';
  requestedSessionType: 'exercise' | 'workout';
  sessionName: string;
  onResume: () => void;
  onDiscard: () => void;
  onSaveAndContinue?: () => void;
}

/**
 * Generate dynamic modal copy based on in-progress and requested session types
 */
function getModalCopy(
  inProgress: 'exercise' | 'workout',
  requested: 'exercise' | 'workout'
) {
  const inProgressLabel = inProgress === 'exercise' ? 'exercise' : 'workout';
  const requestedLabel = requested === 'exercise' ? 'exercise' : 'workout';
  
  return {
    title: `${inProgress === 'exercise' ? 'Exercise' : 'Workout'} in progress`,
    body: `You have an active ${inProgressLabel} already open.`,
    resumeButton: `Resume ${inProgressLabel}`,
    startNewButton: `Start new ${requestedLabel}`,
  };
}

export function SessionConflictModal({
  isOpen,
  onClose,
  inProgressSessionType,
  requestedSessionType,
  sessionName,
  onResume,
  onDiscard,
  onSaveAndContinue,
}: SessionConflictModalProps) {
  const copy = getModalCopy(inProgressSessionType, requestedSessionType);
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={copy.title}
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
          {copy.body}
        </p>

        <div className="space-y-3">
          <Button onClick={onResume} variant="primary" className="w-full">
            {copy.resumeButton}
          </Button>
          
          {onSaveAndContinue && (
            <Button onClick={onSaveAndContinue} variant="neutral" className="w-full">
              {copy.startNewButton}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}