import { FloatingMentorButton } from './FloatingMentorButton';
import { MentorChatWindow } from './MentorChatWindow';
import { useMentor } from '@/contexts/MentorContext';

export function AIMentor() {
  const { isOpen } = useMentor();

  return (
    <>
      <FloatingMentorButton />
      {isOpen && <MentorChatWindow />}
    </>
  );
}