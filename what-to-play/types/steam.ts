export type SteamPlayerSummary = {
  steamid: string;
  personaname?: string;
  profileurl?: string;
  avatarfull?: string;
  communityvisibilitystate?: number;
};

export type SteamOwnedGame = {
  appid: number;
  name: string;
  playtime_forever?: number;
  img_icon_url?: string;
  has_community_visible_stats?: boolean;
  rtime_last_played?: number;
};

export type SteamLibraryResponse = {
  response?: {
    game_count?: number;
    games?: SteamOwnedGame[];
  };
};
