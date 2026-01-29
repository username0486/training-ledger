import { Exercise } from '../types';
import { getGroupInfo } from '../utils/exerciseGrouping';

interface GroupedExerciseRowProps {
  exercise: Exercise;
  exercises: Exercise[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that renders bracket/rail UI for grouped exercises
 */
export function GroupedExerciseRow({
  exercise,
  exercises,
  children,
  className = '',
}: GroupedExerciseRowProps) {
  const groupInfo = getGroupInfo(exercises, exercise.id);
  
  if (!groupInfo.groupId) {
    // Not grouped - render normally
    return <div className={className}>{children}</div>;
  }
  
  // Grouped - render with bracket
  // Visual: ┌ Exercise 1
  //         │ Exercise 2
  //         └────────────
  return (
    <div className={`relative ${className}`}>
      {/* Left bracket rail - always visible for grouped exercises */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent/30" />
      
      {/* Top corner for first exercise */}
      {groupInfo.isFirstInGroup && (
        <div className="absolute left-0 top-0 w-2 h-0.5 bg-accent/30" />
      )}
      
      {/* Bottom corner and rail for last exercise */}
      {groupInfo.isLastInGroup && (
        <>
          <div className="absolute left-0 bottom-0 w-2 h-0.5 bg-accent/30" />
          <div className="absolute left-2 bottom-0 right-0 h-0.5 bg-accent/30" />
        </>
      )}
      
      {/* Content with left padding for bracket */}
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
}
