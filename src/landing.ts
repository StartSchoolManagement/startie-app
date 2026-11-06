// Landing page: whoever reaches the start screen is treated as a new player.
// Scores are already in the database, so clearing only forgets the session.
import { clearPlayerSession } from './utils/player-session';

clearPlayerSession();
