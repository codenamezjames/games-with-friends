import { useParams } from 'react-router-dom';
import { MainMenu } from '@/components/lobby/MainMenu';
import { WaitingRoom } from '@/components/lobby/WaitingRoom';

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();

  // If we have a room code in the URL, show the waiting room
  if (roomCode) {
    return <WaitingRoom />;
  }

  // Otherwise show the main menu
  return <MainMenu />;
}
