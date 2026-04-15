export enum Genre {
  ACTION = 'Action',
  COMEDY = 'Comedy',
  DRAMA = 'Drama',
  HORROR = 'Horror',
  SCI_FI = 'Sci-Fi',
  ROMANCE = 'Romance',
  THRILLER = 'Thriller',
  DOCUMENTARY = 'Documentary'
}

export interface Movie {
  id: string;
  title: string;
  genre: Genre;
  year: number;
  watched: boolean;
}

export interface CreateMovieRequest {
  title: string;
  genre: Genre;
  year: number;
  watched: boolean;
}

export interface UpdateMovieRequest {
  id: string;
  title: string;
  genre: Genre;
  year: number;
  watched: boolean;
}