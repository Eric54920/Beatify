import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

export interface Playlist {
    id: number,
    title: string,
    url: string
}

export interface Song {
    id: number,
    title: string,
    artist: string,
    album: string,
    year: number,
    genre: string,
    path: string,
    type: string,
    size: number,
    time: number,
    dir: number,
    cover: string,
    update_at: string
}

export const playlistFormSchema = toTypedSchema(
    z.object({
        title: z.string().min(1),
        url: z.string().min(1)
    })
);

export const ConnectionFormSchema = toTypedSchema(
    z.object({
        title: z.string().min(1),
        protocol: z.string().min(1),
        address: z.string(),
        username: z.string(),
        password: z.string()
    }
))
