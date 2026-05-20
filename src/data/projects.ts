export type Project = {
  id: string;
  name: string;
  platform: string;
  role: string;
  teamSize: string;
  tech: string[];
  color: string;
  position: [number, number, number];
  bullets: string[];
  links?: {
    label: string;
    href: string;
  }[];
};

export const projects: Project[] = [
  {
    id: 'rope-tangle',
    name: 'Rope Tangle - Master Twisted 3D',
    platform: 'Android',
    role: 'Unity Developer',
    teamSize: '3',
    tech: ['Unity', 'Obi Rope', 'AdMob', 'Firebase'],
    color: '#f7b267',
    position: [-10, 0, -7],
    bullets: [
      'Implemented and optimized rope interaction mechanics and player-environment interactions.',
      'Tuned mobile performance for physics-heavy gameplay.',
      'Integrated AdMob and Firebase for monetization and event tracking.'
    ]
  },
  {
    id: 'skibidi',
    name: 'Skibidi Toilet Fight',
    platform: 'Android',
    role: 'Unity Developer',
    teamSize: '3',
    tech: ['Unity', 'Invector Third Person Controller', 'AdMob', 'Firebase'],
    color: '#7bdff2',
    position: [10, 0, -6],
    bullets: [
      'Developed movement, combat, AI behavior, mission flow, and player interaction systems.',
      'Built and optimized core gameplay features for Android devices.',
      'Integrated advertising and analytics tracking.'
    ]
  },
  {
    id: 'hellven',
    name: 'Hellven',
    platform: 'WebGL',
    role: 'Unity Developer',
    teamSize: '11',
    tech: ['Unity', 'Nakama', 'Spine'],
    color: '#ff6b6b',
    position: [-13, 0, 6],
    bullets: [
      'Collaborated on demo builds for fundraising and product validation.',
      'Implemented Unity client features for WebGL gameplay.',
      'Supported multiplayer and client-server gameplay flows using Nakama.'
    ]
  },
  {
    id: 'planet-sandbox',
    name: 'Planet Sandbox',
    platform: 'WebGL, PC/Windows',
    role: 'Unity Game Developer',
    teamSize: '9',
    tech: ['Unity', 'Photon Fusion'],
    color: '#b8f2e6',
    position: [13, 0, 7],
    bullets: [
      'Implemented and updated in-game UI with UI/UX designers.',
      'Integrated multilingual support.',
      'Supported multiplayer-related development using Photon Fusion.'
    ]
  },
  {
    id: 'tapout',
    name: 'Tapout: Unlock Anime',
    platform: 'Android',
    role: 'Unity Developer',
    teamSize: '3',
    tech: ['Unity', 'AdMob', 'Firebase'],
    color: '#cdb4db',
    position: [0, 0, -12],
    bullets: [
      'Developed and optimized mobile gameplay features.',
      'Integrated advertising and analytics tracking using AdMob and Firebase.',
      'Supported production delivery for Android.'
    ]
  },
  {
    id: 'zipline-army',
    name: 'Zipline Army',
    platform: 'Android',
    role: 'Unity Developer',
    teamSize: '3',
    tech: ['Unity 2D', 'DragonBones'],
    color: '#90be6d',
    position: [0, 0, 13],
    bullets: [
      'Implemented rear combat systems and in-game UI.',
      'Created and configured 100 game levels.',
      'Supported mobile gameplay iteration and level balancing.'
    ]
  }
];
