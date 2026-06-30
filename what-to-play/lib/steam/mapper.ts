import { steamGameImages, type SteamOwnedGame } from "@/lib/steam/api";

export function mapSteamGame(game: SteamOwnedGame) {
  const images = steamGameImages(game.appid, game.img_icon_url);

  return {
    appid: String(game.appid),
    name: game.name,
    playtimeMinutes: game.playtime_forever ?? 0,
    lastPlayedAt: game.rtime_last_played
      ? new Date(game.rtime_last_played * 1000).toISOString()
      : null,
    coverUrl: images.coverUrl,
    headerUrl: images.headerUrl,
    rawData: game,
  };
}
