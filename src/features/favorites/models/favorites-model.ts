export interface Favorite {
  busStopCode: string;
  timestamp: number;
  order: number;
}

export interface FavoriteBusStop {
  busStopCode: string;
  description: string;
  roadName: string;
  isFavorited: boolean;
}
