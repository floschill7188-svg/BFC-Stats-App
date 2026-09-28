
import { MasterRosterPlayer } from '../types';

// Der reguläre Kader (BFC U18, Herren etc.)
export const initialRoster: MasterRosterPlayer[] = [
  { id: 1, name: 'Nikola Jovic', teams: ['BFC U18'], seasons: ['25/26'] },
  { id: 2, name: 'Leonidas Stergiou', teams: ['BFC U18'], seasons: ['25/26'] },
  { id: 13, name: 'Arthur Cabral', teams: ['BFC U18'], seasons: ['25/26'] }
];

// Fixe Vorlagen für den Weihnachtszock - Unabhängig vom Master-Kader
export const TOURNAMENT_TEMPLATES: Record<string, string[]> = {
  "Team Mark": ["Mark", "Jan", "Ada", "Arne", "Leon", "Tymofii"],
  "Team Marc": ["Marc", "Johannes", "Antonio", "Milan", "Jakob", "Christof", "Simon"],
  "Team Mirko": ["Mirko", "Carlos", "Niko", "Niels", "Josip", "Lars"],
  "Team Florian": ["Florian", "Burkhardt", "Murphy", "Sascha", "Lukas B.", "Adam"]
};
