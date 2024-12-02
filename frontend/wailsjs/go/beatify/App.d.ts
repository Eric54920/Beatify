// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {beatify} from '../models';

export function AddConnection(arg1:string):Promise<beatify.Response>;

export function CreateDir(arg1:string):Promise<beatify.Response>;

export function DeleteDir(arg1:number):Promise<beatify.Response>;

export function GetAllDirs():Promise<beatify.Response>;

export function GetPlayNextList(arg1:number,arg2:number,arg3:string):Promise<beatify.Response>;

export function GetSong(arg1:number):Promise<beatify.Response>;

export function GetSongs(arg1:number,arg2:string):Promise<beatify.Response>;

export function IsExistConnection():Promise<beatify.Response>;

export function PlayNext(arg1:string,arg2:number,arg3:number,arg4:number):Promise<beatify.Response>;

export function PlayPrev(arg1:string,arg2:number,arg3:number,arg4:number):Promise<beatify.Response>;

export function ReSyncDir(arg1:number):Promise<beatify.Response>;

export function StartServer():Promise<void>;

export function UpdateDir(arg1:number,arg2:string):Promise<beatify.Response>;

export function UpdateSong(arg1:number,arg2:string):Promise<beatify.Response>;
