export type FeedImage = {
  src: string;
  file?: string;
  width: number | null;
  height: number | null;
};

export type FeedPin = {
  id: string;
  url: string;
  category: string;
  title: string;
  pinner: string;
  board: string;
  reactions: number;
  note: string | null;
  description?: string | null;
  images: FeedImage[];
};

export type FeedCategory = {
  name: string;
  color: string;
  raw?: string;
};

export type Feed = {
  feed_date: string;
  updated_at?: string;
  categories: FeedCategory[];
  pins: FeedPin[];
};
