
export interface PlayerStats {
  FGM: number; // Field Goals Made (2-pointers)
  FGA: number; // Field Goals Attempted (2-pointers)
  '3PM': number; // 3-Pointers Made
  '3PA': number; // 3-Pointers Attempted
  OREB: number; // Offensive Rebounds
  DREB: number; // Defensive Rebounds
  AST: number;  // Assists
  STL: number;  // Steals
  BLK: number;  // Blocks
  TO: number;   // Turnovers
  
  // Nacherfasste Stats
  MIN?: number; // Minuten
  FTM?: number; // Freiwürfe getroffen
  FTA?: number; // Freiwürfe versucht
  PF?: number;  // Persönliche Fouls
  PLUS_MINUS?: number; // Plus/Minus
}

export type Stat = keyof PlayerStats;

export const SEASONS = ['25/26', '26/27'] as const;
export type Season = typeof SEASONS[number];

export interface MasterRosterPlayer {
  id: number;
  name: string;
  number?: number;
  teams?: string[]; // z.B. ['BFC U18', 'BFC Herren 1']
  seasons?: Season[]; // z.B. ['25/26', '26/27']
}

export interface Player extends MasterRosterPlayer {
  stats: PlayerStats;
  onCourt?: boolean; // NEU: Ist der Spieler gerade auf dem Feld?
}

export interface Team {
  name:string;
  players: Player[];
  score: number;
}

export interface Opponent {
    name: string;
    score: number; // NEU: Score für Gegner (wichtig für Strafpunkte im Turnier)
}

export interface GameState {
  gameId: number;
  status: 'inprogress' | 'finished';
  season?: Season; // z.B. '25/26' | '26/27'
  team: Team;
  opponent: Opponent;
  quarter: number;
  actionLog: ActionLogEntry[];
  gameType?: 'home' | 'away';
  coachId?: string;
  isReleased?: boolean;
  
  // Tournament Features
  isTournament?: boolean; // NEU: Weihnachtszock Modus?
  gameTime?: number;      // NEU: Aktuelle Spielzeit in Sekunden
  isPaused?: boolean;     // NEU: Ist die Uhr angehalten?
}

export interface ActionLogEntry {
  id: number;
  playerId: number;
  stat: Stat;
  value: number;
  description: string;
  quarter: number;
}

export type UserRole = 'Trainer' | 'CoTrainer' | 'Spieler';
export type PlayerSubgroup = 'BFC U18' | 'BFC Herren 1' | 'BFC Herren 2' | 'Team Mark' | 'Team Marc' | 'Team Mirko' | 'Team Florian';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  playerTeams?: PlayerSubgroup[];
  linkedRosterPlayerId?: number | null;
}

export interface Notification {
  id: string;
  type: 'newUser' | 'beerListReminder' | 'newGame';
  message: string;
  timestamp: any;
  readBy: string[];
  targetRoles?: UserRole[];
  targetUids?: string[];
  relatedUid?: string;
  linkTo?: View;
  linkToParams?: { [key: string]: string };
}

export interface BeerListEntry {
  id: string;
  type: 'drink' | 'payment';
  userId: string;
  userName: string;
  regularDrinks?: number;
  discountedDrinks?: number;
  amount?: number;
  payerId?: string;
  payerName?: string;
  team?: string;
  timestamp: any;
  notes?: string;
}

export type View = 'loading' | 'login' | 'home' | 'gameSetup' | 'tournamentSetup' | 'game' | 'summary' | 'seasonStats' | 'account' | 'userManagement' | 'beerList';
