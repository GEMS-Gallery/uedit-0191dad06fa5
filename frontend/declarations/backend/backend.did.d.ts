import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Document {
  'id' : bigint,
  'title' : string,
  'content' : string,
  'owner' : Principal,
  'timestamp' : Time,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : Document } |
  { 'err' : string };
export type Time = bigint;
export interface _SERVICE {
  'createDocument' : ActorMethod<[string, string], bigint>,
  'deleteDocument' : ActorMethod<[bigint], Result>,
  'getAllDocuments' : ActorMethod<[Principal], Array<Document>>,
  'getDocument' : ActorMethod<[bigint, Principal], Result_1>,
  'renameDocument' : ActorMethod<[bigint, string], Result>,
  'updateDocument' : ActorMethod<[bigint, string, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
